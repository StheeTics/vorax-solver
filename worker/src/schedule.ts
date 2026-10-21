// The repo's loops, started on time by Cloudflare's cron triggers (wrangler.jsonc "triggers"): GitHub's own
// scheduler fired the hourly jobs about once every two hours, then stopped. Each trigger asks GitHub to start
// a workflow on main, with GITHUB_DISPATCH_TOKEN (a fine-grained token that can only start this repo's
// workflows). The workflows keep their own schedules as a backup.

const REPO = 'tidewarden/tli-vorax-simulator'

/** The workflows each cron trigger starts. */
export const SCHEDULE: Record<string, string[]> = {
  '3 * * * *': ['live-data.yml'],
  '33 * * * *': ['issue-fixer.yml'],
  '45 6 * * *': ['daily-check.yml'],
}

/** The workflows the dashboard's Run now may start (not the app release: that needs its version tag). */
export const RUNNABLE = new Set(['live-data.yml', 'issue-fixer.yml', 'daily-check.yml', 'strengths.yml', 'deploy.yml'])

type Fetch = (url: string, init: RequestInit) => Promise<Response>

/** Asks GitHub to start a workflow on main; null when it did, else why not. */
export async function dispatch(file: string, token: string | undefined, fetcher: Fetch = fetch): Promise<string | null> {
  if (!token) return 'no GITHUB_DISPATCH_TOKEN'
  const res = await fetcher(`https://api.github.com/repos/${REPO}/actions/workflows/${file}/dispatches`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'vorax-live' },
    body: JSON.stringify({ ref: 'main' }),
  })
  return res.ok ? null : `GitHub answered ${res.status}: ${(await res.text()).slice(0, 200)}`
}

export async function onSchedule(cron: string, env: { GITHUB_DISPATCH_TOKEN?: string }, fetcher: Fetch = fetch): Promise<void> {
  if (!env.GITHUB_DISPATCH_TOKEN) return
  for (const file of SCHEDULE[cron] ?? []) {
    const why = await dispatch(file, env.GITHUB_DISPATCH_TOKEN, fetcher)
    if (why) console.log(`starting ${file} failed: ${why}`)
  }
}
