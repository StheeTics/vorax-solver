// Pulls new shared boards from the collector into data/live/raw/<date>.jsonl and rewrites
// data/live/rates.json, and named panel icons into data/live/icons.jsonl. Usage (the scheduled workflow
// sets these):
//   LIVE_DATA_URL=https://… LIVE_DATA_TOKEN=… npx vite-node scripts/live/pull.ts
import { existsSync } from 'node:fs'
import { allRows, pull, pullIcons } from './collect'
import { writeRates } from './rates'

const url = process.env.LIVE_DATA_URL
const token = process.env.LIVE_DATA_TOKEN
if (!url || !token) {
  console.log('LIVE_DATA_URL / LIVE_DATA_TOKEN not set: no collector yet, nothing to pull.')
  process.exit(0)
}
const added = await pull(url, token)
const icons = await pullIcons(url, token)
if (icons) console.log(`${icons} new named icons in data/live/icons.jsonl`)
// rates.json carries the time it was made: rewritten only when there's something new, or the
// 15-minute job would commit every run
if (added > 0 || !existsSync('data/live/rates.json')) {
  const r = writeRates(allRows())
  console.log(`${added} new boards; ${r.boards} boards in ${r.runs} games so far`)
} else console.log('0 new boards')
