import { describe, expect, it } from 'vitest'
import { LIMITS, usageOf } from '../../scripts/live/usage'

const now = new Date('2026-10-23T14:00:00Z')
const cfAnswer = {
  data: { viewer: { accounts: [{
    d1AnalyticsAdaptiveGroups: [
      { dimensions: { date: '2026-10-23' }, sum: { rowsRead: 2_410_292, rowsWritten: 90_391 } },
      { dimensions: { date: '2026-10-22' }, sum: { rowsRead: 3_957_309, rowsWritten: 110_783 } },
    ],
    d1StorageAdaptiveGroups: [
      { dimensions: { date: '2026-10-22' }, max: { databaseSizeBytes: 104_259_580 } },
      { dimensions: { date: '2026-10-23' }, max: { databaseSizeBytes: 192_159_740 } },
    ],
    workersInvocationsAdaptive: [
      { dimensions: { date: '2026-10-23' }, sum: { requests: 14_000 } },
      { dimensions: { date: '2026-10-23' }, sum: { requests: 682 } },
      { dimensions: { date: '2026-10-22' }, sum: { requests: 51_316 } },
    ],
  }] } },
  errors: null,
}
const ghAnswer = {
  usageItems: [
    { product: 'actions', sku: 'actions_linux', quantity: 300, unitType: 'Minutes', netAmount: 0, repositoryName: 'someone/secret' },
    { product: 'actions', sku: 'actions_windows', quantity: 40, unitType: 'Minutes', netAmount: 0, repositoryName: 'someone/secret' },
    { product: 'actions', sku: 'actions_linux', quantity: 4000, unitType: 'Minutes', netAmount: 0, repositoryName: 'someone/open' },
    { product: 'actions', sku: 'actions_storage', quantity: 1.5, unitType: 'GigabyteHours', netAmount: 0 },
    { product: 'copilot', sku: 'copilot_for_business', quantity: 1, unitType: 'UserMonths', netAmount: 19 },
  ],
}
const env = { cfToken: 'cf', cfAccount: 'acct', ghToken: 'gh', ghRepo: 'someone/secret' }

function fakeFetch(answers: { cf?: unknown; gh?: unknown; cfStatus?: number; ghStatus?: number }) {
  const calls: { url: string; init?: RequestInit }[] = []
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const cf = url.includes('cloudflare')
    const status = (cf ? answers.cfStatus : answers.ghStatus) ?? 200
    return new Response(JSON.stringify(cf ? answers.cf : answers.gh), { status })
  }) as unknown as typeof fetch
  return { fn, calls }
}

describe('the free plans’ use for the dashboard', () => {
  it('without tokens there is nothing to add', async () => {
    const { fn, calls } = fakeFetch({})
    expect(await usageOf({}, now, fn)).toBeNull()
    expect(calls).toEqual([])
  })

  it('Cloudflare per UTC day, oldest first: rows and requests added up, the database size its largest', async () => {
    const { fn, calls } = fakeFetch({ cf: cfAnswer, gh: ghAnswer })
    const u = (await usageOf(env, now, fn))!
    expect(u.limits).toEqual(LIMITS)
    expect(u.cloudflare).toEqual([
      { day: '2026-10-22', rowsRead: 3_957_309, rowsWritten: 110_783, requests: 51_316, bytes: 104_259_580 },
      { day: '2026-10-23', rowsRead: 2_410_292, rowsWritten: 90_391, requests: 14_682, bytes: 192_159_740 },
    ])
    const sent = JSON.parse(String(calls[0].init?.body))
    expect(sent.variables).toEqual({ a: 'acct', s: '2026-10-17' })
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe('Bearer cf')
  })

  it('GitHub this month: this repo’s Actions minutes only, Windows counted twice; other repos’ apart', async () => {
    const { fn, calls } = fakeFetch({ cf: cfAnswer, gh: ghAnswer })
    const u = (await usageOf(env, now, fn))!
    expect(u.github).toEqual({ month: '2026-10', minutes: 380, runners: { actions_linux: 300, actions_windows: 40 }, others: 4000, charged: 0 })
    expect(calls.map(c => c.url)).toContain('https://api.github.com/users/someone/settings/billing/usage?year=2026&month=10')
  })

  it('a part whose API fails is left out, and the other is kept', async () => {
    const { fn } = fakeFetch({ cf: cfAnswer, ghStatus: 403, gh: { message: 'no' } })
    const u = (await usageOf(env, now, fn))!
    expect(u.cloudflare).toHaveLength(2)
    expect(u.github).toBeUndefined()
    const bad = fakeFetch({ cf: { data: null, errors: [{ message: 'not authorized' }] }, gh: ghAnswer })
    const v = (await usageOf(env, now, bad.fn))!
    expect(v.cloudflare).toBeUndefined()
    expect(v.github?.minutes).toBe(380)
  })

  it('only the part whose token is set is asked', async () => {
    const { fn, calls } = fakeFetch({ gh: ghAnswer })
    const u = (await usageOf({ ghToken: 'gh', ghRepo: 'someone/secret' }, now, fn))!
    expect(calls.some(c => c.url.includes('cloudflare'))).toBe(false)
    expect(u.cloudflare).toBeUndefined()
  })
})
