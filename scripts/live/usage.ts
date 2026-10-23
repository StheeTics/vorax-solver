// How much of the free plans is used, for the dashboard: the D1 database and the Worker per day from Cloudflare's
// analytics API, and this month's GitHub Actions minutes from GitHub's billing API. scripts/live/summary.ts adds it
// to the summary. Each part needs its own token (see .github/workflows/dashboard.yml); without it, or when the API
// fails, that part is left out and the summary is sent as usual.
import type { Usage } from '../../worker/src/stats'

/** The free plans: D1 5M rows read and 100k written a day and 500 MB per database, Workers 100k requests a day,
 *  GitHub 2,000 Actions minutes a month for private repos. */
export const LIMITS: Usage['limits'] = { rowsRead: 5_000_000, rowsWritten: 100_000, requests: 100_000, bytes: 500_000_000, minutes: 2000 }

const DAYS = 7
/** GitHub counts a Windows minute as 2 of the free minutes and a macOS minute as 10 */
const WEIGHT: [RegExp, number][] = [[/windows/i, 2], [/mac/i, 10]]

export interface UsageEnv { cfToken?: string; cfAccount?: string; ghToken?: string; ghUser?: string }

const QUERY = `query($a: String!, $s: Date!) { viewer { accounts(filter: { accountTag: $a }) {
  d1AnalyticsAdaptiveGroups(limit: 1000, filter: { date_geq: $s }) { sum { rowsRead rowsWritten } dimensions { date } }
  d1StorageAdaptiveGroups(limit: 1000, filter: { date_geq: $s }) { max { databaseSizeBytes } dimensions { date } }
  workersInvocationsAdaptive(limit: 1000, filter: { date_geq: $s }) { sum { requests } dimensions { date } }
} } }`

interface Group { dimensions: { date: string }; sum?: Record<string, number>; max?: Record<string, number> }

async function cloudflare(token: string, account: string, now: Date, fetchFn: typeof fetch): Promise<Usage['cloudflare']> {
  const start = new Date(now.getTime() - (DAYS - 1) * 86_400_000).toISOString().slice(0, 10)
  const res = await fetchFn('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { a: account, s: start } }),
  })
  if (!res.ok) throw new Error(`Cloudflare answered ${res.status}`)
  const body = (await res.json()) as { data?: { viewer: { accounts: Record<string, Group[]>[] } }; errors?: { message: string }[] | null }
  const a = body.data?.viewer.accounts[0]
  if (!a) throw new Error(`Cloudflare: ${body.errors?.[0]?.message ?? 'no account'}`)
  const days = new Map<string, NonNullable<Usage['cloudflare']>[number]>()
  const day = (d: string) => days.get(d) ?? days.set(d, { day: d, rowsRead: 0, rowsWritten: 0, requests: 0, bytes: 0 }).get(d)!
  // the limits are per account a day (rows, requests) and per database (size): rows and requests add up, the
  // size is the largest database's
  for (const g of a.d1AnalyticsAdaptiveGroups ?? []) {
    day(g.dimensions.date).rowsRead += g.sum?.rowsRead ?? 0
    day(g.dimensions.date).rowsWritten += g.sum?.rowsWritten ?? 0
  }
  for (const g of a.d1StorageAdaptiveGroups ?? []) day(g.dimensions.date).bytes = Math.max(day(g.dimensions.date).bytes, g.max?.databaseSizeBytes ?? 0)
  for (const g of a.workersInvocationsAdaptive ?? []) day(g.dimensions.date).requests += g.sum?.requests ?? 0
  return [...days.values()].sort((x, y) => x.day.localeCompare(y.day))
}

interface BillingItem { product: string; sku: string; quantity: number; unitType: string; netAmount: number }

async function github(token: string, user: string, now: Date, fetchFn: typeof fetch): Promise<Usage['github']> {
  const year = now.getUTCFullYear(), month = now.getUTCMonth() + 1
  const res = await fetchFn(`https://api.github.com/users/${user}/settings/billing/usage?year=${year}&month=${month}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
  })
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
  const { usageItems = [] } = (await res.json()) as { usageItems?: BillingItem[] }
  const runners: Record<string, number> = {}
  let minutes = 0, charged = 0
  for (const i of usageItems.filter(i => /actions/i.test(i.product))) {
    charged += i.netAmount ?? 0
    if (!/minute/i.test(i.unitType)) continue
    runners[i.sku] = (runners[i.sku] ?? 0) + i.quantity
    minutes += i.quantity * (WEIGHT.find(([re]) => re.test(i.sku))?.[1] ?? 1)
  }
  return { month: `${year}-${String(month).padStart(2, '0')}`, minutes: Math.round(minutes), runners, charged: Math.round(charged * 100) / 100 }
}

/** The usage for the summary, or null when neither part's token is set. A part whose API failed is left out,
 *  with a line in the log. */
export async function usageOf(env: UsageEnv, now = new Date(), fetchFn: typeof fetch = fetch): Promise<Usage | null> {
  if (!(env.cfToken && env.cfAccount) && !(env.ghToken && env.ghUser)) return null
  const u: Usage = { checked: now.toISOString(), limits: LIMITS }
  if (env.cfToken && env.cfAccount) {
    try { u.cloudflare = await cloudflare(env.cfToken, env.cfAccount, now, fetchFn) } catch (e) { console.log(`Cloudflare usage left out: ${(e as Error).message}`) }
  }
  if (env.ghToken && env.ghUser) {
    try { u.github = await github(env.ghToken, env.ghUser, now, fetchFn) } catch (e) { console.log(`GitHub usage left out: ${(e as Error).message}`) }
  }
  return u
}
