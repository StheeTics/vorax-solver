// Works out the dashboard's numbers from every board in data/live/raw and sends them to the collector
// (worker/src/summary.ts), with the free plans' use when its tokens are set (usage.ts). The dashboard workflow runs
// it after the pull:
//   LIVE_DATA_URL=https://… LIVE_DATA_TOKEN=… npx vite-node scripts/live/summary.ts
import { sendSummary, statRows } from './collect'
import { usageOf } from './usage'

const url = process.env.LIVE_DATA_URL
const token = process.env.LIVE_DATA_TOKEN
if (!url || !token) {
  console.log('LIVE_DATA_URL / LIVE_DATA_TOKEN not set: no collector, no summary sent.')
  process.exit(0)
}
const usage = await usageOf({
  cfToken: process.env.CF_ANALYTICS_TOKEN, cfAccount: process.env.CLOUDFLARE_ACCOUNT_ID,
  ghToken: process.env.GH_BILLING_TOKEN, ghUser: process.env.GITHUB_REPOSITORY_OWNER,
})
console.log(`Dashboard summary sent: ${await sendSummary(url, token, statRows(), fetch, usage)}${usage ? ' (with usage)' : ''}`)
