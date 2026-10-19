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

type Fetch = (url: string, init: RequestInit) => Promise<Response>

export async function onSchedule(cron: string, env: { GITHUB_DISPATCH_TOKEN?: string }, fetcher: Fetch = fetch): Promise<void> {
  const token = env.GITHUB_DISPATCH_TOKEN
  if (!token) return
  for (const file of SCHEDULE[cron] ?? []) {
    const res = await fetcher(`https://api.github.com/repos/${REPO}/actions/workflows/${file}/dispatches`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'vorax-live' },
      body: JSON.stringify({ ref: 'main' }),
    })
    if (!res.ok) console.log(`starting ${file} failed: ${res.status} ${await res.text()}`)
  }
}
