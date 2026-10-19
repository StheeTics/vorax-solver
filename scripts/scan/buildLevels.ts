// Builds the colour correction's reference (src/solver/scan/levels.json): how a normal capture's levels
// spread in the parts the reader looks at, averaged over the labelled frames.
// Usage: npx vite-node scripts/scan/buildLevels.ts   (frames in training/, labels in scripts/scan/truth.json)
import { readFileSync, writeFileSync } from 'node:fs'
import { decodePng } from './png'
import type { Label } from './buildData'
import { levels, readAreas } from '../../src/solver/scan/levels'
import { layout } from '../../src/solver/scan/layout'

const truth = JSON.parse(readFileSync('scripts/scan/truth.json', 'utf8')) as Record<string, Label>
const files = Object.entries(truth).filter(([, label]) => label.state).map(([file]) => file)
const sum = new Array(256).fill(0)
for (const f of files) {
  const img = decodePng(readFileSync(`training/${f}`))
  levels(img, readAreas(layout(img))).forEach((v, i) => (sum[i] += v))
}
writeFileSync('src/solver/scan/levels.json', JSON.stringify(sum.map(v => Number((v / files.length).toFixed(6)))) + '\n')
console.log(`levels from ${files.length} frames`)
