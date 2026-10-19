// Writes src/solver/scan/learnedIcons.json from the icons players taught (data/live/icons.jsonl).
// Usage: vite-node scripts/live/learnIcons.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { unpack, type PackedScanData } from '../../src/solver/scan/data'
import { acceptIcons, type TaughtIcon } from './mergeIcons'
const file = 'data/live/icons.jsonl'
const taught: TaughtIcon[] = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []
const builtIn = unpack(JSON.parse(readFileSync('src/solver/scan/data.json', 'utf8')) as PackedScanData).instrumentIcons
const learned = acceptIcons(taught, builtIn)
writeFileSync('src/solver/scan/learnedIcons.json', JSON.stringify(learned) + '\n')
const counts = Object.entries(learned).map(([n, vs]) => `${n} (${vs.length})`)
console.log(counts.length ? `Learned icons: ${counts.join(', ')}` : 'No learned icons yet.')
