// @vitest-environment node
import { onSchedule, SCHEDULE } from '../../worker/src/schedule'

describe('the collector starts the repo’s loops on time (GitHub’s own scheduler proved unreliable)', () => {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = vi.fn(async (url: string, init: RequestInit) => (calls.push({ url, init }), new Response(null, { status: 204 })))
  beforeEach(() => (calls.length = 0))

  it('the odds job every hour, the issue fixer every hour, the daily check once a day', () => {
    expect(SCHEDULE).toEqual({ '3 * * * *': ['live-data.yml'], '33 * * * *': ['issue-fixer.yml'], '45 6 * * *': ['daily-check.yml'] })
  })
  it('every cron the schedule uses is one Cloudflare fires (wrangler.jsonc)', async () => {
    const { readFileSync } = await import('node:fs')
    const crons = JSON.parse(readFileSync('worker/wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, '')).triggers.crons
    expect([...crons].sort()).toEqual(Object.keys(SCHEDULE).sort())
  })

  it('asks GitHub to start each workflow due, on main, with the dispatch token', async () => {
    await onSchedule('3 * * * *', { GITHUB_DISPATCH_TOKEN: 'tok' }, fetch as never)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://api.github.com/repos/tidewarden/tli-vorax-simulator/actions/workflows/live-data.yml/dispatches')
    expect(calls[0].init.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ ref: 'main' })
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer tok')
  })

  it('does nothing without the token, or for a time with nothing due', async () => {
    await onSchedule('3 * * * *', {}, fetch as never)
    await onSchedule('59 * * * *', { GITHUB_DISPATCH_TOKEN: 'tok' }, fetch as never)
    expect(calls).toHaveLength(0)
  })
})

describe('Run now, from the dashboard', () => {
  const env = { EXPORT_TOKEN: 'x', IP_SALT: 's', DASHBOARD_TOKEN: 'pw', GITHUB_DISPATCH_TOKEN: 'tok', LIMIT: { limit: async () => ({ success: true }) } }
  const run = (file: string, pw = 'pw') => new Request(`https://w.dev/v1/run/${file}`, { method: 'POST', headers: { authorization: `Bearer ${pw}` } })

  it('starts a loop’s workflow, with the dashboard password', async () => {
    const { handle } = await import('../../worker/src/index')
    const calls: string[] = []
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => (calls.push(String(url)), new Response(null, { status: 204 })))
    try {
      const res = await handle(run('live-data.yml'), env, {} as never)
      expect(res.status).toBe(200)
      expect(calls).toEqual(['https://api.github.com/repos/tidewarden/tli-vorax-simulator/actions/workflows/live-data.yml/dispatches'])
    } finally {
      fetcher.mockRestore()
    }
  })
  it('refuses without the password, and any workflow that isn’t a loop (a release needs its tag)', async () => {
    const { handle } = await import('../../worker/src/index')
    expect((await handle(run('live-data.yml', 'nope'), env, {} as never)).status).toBe(401)
    expect((await handle(run('desktop.yml'), env, {} as never)).status).toBe(404)
  })
  it('says why when GitHub refuses (a missing or wrong token)', async () => {
    const { handle } = await import('../../worker/src/index')
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad credentials', { status: 401 }))
    try {
      const res = await handle(run('issue-fixer.yml'), env, {} as never)
      expect(res.status).toBe(502)
      expect((await res.json()).error).toMatch(/401.*Bad credentials/)
    } finally {
      fetcher.mockRestore()
    }
  })
})
