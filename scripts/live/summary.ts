// Works out the dashboard's numbers from every board in data/live/raw and sends them to the collector
// (worker/src/summary.ts). The live-data workflow runs it after the pull:
//   LIVE_DATA_URL=https://… LIVE_DATA_TOKEN=… npx vite-node scripts/live/summary.ts
import { sendSummary, statRows } from './collect'

const url = process.env.LIVE_DATA_URL
const token = process.env.LIVE_DATA_TOKEN
if (!url || !token) {
  console.log('LIVE_DATA_URL / LIVE_DATA_TOKEN not set: no collector, no summary sent.')
  process.exit(0)
}
console.log(`Dashboard summary sent: ${await sendSummary(url, token, statRows())}`)
