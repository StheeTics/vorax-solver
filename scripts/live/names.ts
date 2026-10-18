// Writes worker/src/names.json: the card, instrument and protocol names the collector accepts.
// Usage: npx vite-node scripts/live/names.ts
import { writeFileSync } from 'node:fs'
import { names } from '../../src/strategy/advisor'
import data from '../../src/solver/scan/data.json'

const n = names()
const protocols = Object.keys((data as { cards: Record<string, unknown> }).cards).filter(k => k.startsWith('protocol:')).map(k => k.slice('protocol:'.length)).sort()
writeFileSync('worker/src/names.json', JSON.stringify({ potions: n.potions, instruments: n.instruments, protocols }, null, 1) + '\n')
console.log(`${n.potions.length} potions, ${n.instruments.length} instruments, ${protocols.length} protocols`)
