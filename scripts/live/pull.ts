// Pulls new shared boards from the collector into data/live/raw/<date>.jsonl, named panel icons into
// data/live/icons.jsonl and cards the Solver couldn't name into data/live/cards.jsonl. Usage (the nightly jobs and
// the dashboard workflow set these):
//   LIVE_DATA_URL=https://… LIVE_DATA_TOKEN=… npx vite-node scripts/live/pull.ts
// The odds (data/live/rates.json) aren't worked out from the boards since Oct 24: they had settled, and the boards
// are stored without their cards since (worker/src/validate.ts lean). scripts/live/rates.ts still works on old ones.
import { pull, pullCards, pullIcons } from './collect'

const url = process.env.LIVE_DATA_URL
const token = process.env.LIVE_DATA_TOKEN
if (!url || !token) {
  console.log('LIVE_DATA_URL / LIVE_DATA_TOKEN not set: no collector yet, nothing to pull.')
  process.exit(0)
}
const added = await pull(url, token)
const icons = await pullIcons(url, token)
if (icons) console.log(`${icons} new named icons in data/live/icons.jsonl`)
console.log(`${added} new boards`)
const cards = await pullCards(url, token)
if (cards) console.log(`${cards} cards the Solver couldn't name, in data/live/cards.jsonl`)
