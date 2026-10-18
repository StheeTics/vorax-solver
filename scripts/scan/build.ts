// Builds the screenshot reader's reference data (src/solver/scan/data.json) from labelled live frames.
// Usage: npx vite-node scripts/scan/build.ts   (frames in training/, labels in scripts/scan/truth.json)
import { readFileSync, writeFileSync } from 'node:fs'
import { decodePng } from './png'
import { buildData, type Label } from './buildData'
import { pack } from '../../src/solver/scan/data'

const truth = JSON.parse(readFileSync('scripts/scan/truth.json', 'utf8')) as Record<string, Label>
const frames = Object.entries(truth)
  .filter(([, label]) => label.state)
  .map(([file, label]) => ({ img: decodePng(readFileSync(`training/${file}`)), label }))
// tick frames labelled for their hand only; a raised card is out of place and a flash blurs them, so those don't teach
const handOnly = Object.entries(JSON.parse(readFileSync('scripts/scan/cards.json', 'utf8')) as Record<string, NonNullable<Label['cards']>>)
  .filter(([, cards]) => cards.hover === undefined && !cards.blurred)
  .map(([file, cards]) => ({ img: decodePng(readFileSync(`training/${file}`)), label: { kind: 'cards', cards } as Label }))
const data = buildData([...frames, ...handOnly])
writeFileSync('src/solver/scan/data.json', JSON.stringify(pack(data)) + '\n')
const count = (m: Record<string, unknown[]>) => Object.entries(m).map(([k, v]) => `${k}:${v.length}`).join(' ')
console.log(`${data.frames} frames, ${handOnly.length} hand-only tick frames`)
for (const k of ['label', 'round', 'refresh'] as const) console.log(`digits ${k}: ${count(data.digits[k])}`)
console.log(`rarities: ${count(data.rarityRgb)}`)
console.log(`cards: ${Object.keys(data.cards).length}, headers: ${count(data.headers)}, instruments: ${count(data.instrumentIcons)}`)
