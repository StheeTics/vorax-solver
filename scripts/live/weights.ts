// Updates src/data/liveWeights.ts from data/live/rates.json within the guards in propose.ts, and prints
// the changes for the commit message. With --propose it only writes them to data/live/proposal.md, for
// review. Usage: npx vite-node scripts/live/weights.ts [--propose]
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
const propose = process.argv.includes('--propose')
if (!changes.length) {
  console.log('No weight changes.')
  if (propose && existsSync('data/live/proposal.md')) writeFileSync('data/live/proposal.md', '# Proposed weight changes\n\nNone: the live data agrees with the current weights.\n')
  process.exit(0)
}
if (propose) {
  writeFileSync('data/live/proposal.md', `# Proposed weight changes\n\nFrom data/live/rates.json, within the guards in scripts/live/propose.ts. Not applied: run \`npx vite-node scripts/live/weights.ts\` to apply.\n\n${changes.map(c => `- ${c}`).join('\n')}\n`)
  console.log(changes.join('\n'))
  process.exit(0)
}
next.updated = new Date().toISOString().slice(0, 10)
writeFileSync('src/data/liveWeights.ts', renderWeights(next))
console.log(changes.join('\n'))
