// Updates src/data/liveWeights.ts from data/live/rates.json within the guards in propose.ts, and prints
// the changes for the commit message. Usage: npx vite-node scripts/live/weights.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { LIVE_WEIGHTS } from '../../src/data/liveWeights'
import { proposeWeights, renderWeights } from './propose'
import type { Rates } from './rates'

if (!existsSync('data/live/rates.json')) {
  console.log('No data/live/rates.json yet: nothing to update.')
  process.exit(0)
}
const rates = JSON.parse(readFileSync('data/live/rates.json', 'utf8')) as Rates
const { next, changes } = proposeWeights(LIVE_WEIGHTS, rates)
if (!changes.length) {
  console.log('No weight changes.')
  process.exit(0)
}
next.updated = new Date().toISOString().slice(0, 10)
writeFileSync('src/data/liveWeights.ts', renderWeights(next))
console.log(changes.join('\n'))
