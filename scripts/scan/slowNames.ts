// Which cards' names read slowly: every labelled card's title read as the Solver reads it (titles.ts readTitle,
// steps cheapest first), one at a time, with how many steps it took, how long, and whether the name came out right.
// Prints per card name: cards read, mean steps, mean ms, how often step 1 settled it, wrong reads.
// Usage: npx vite-node scripts/scan/slowNames.ts [--scale 1.333] [--out file.json]
import { readFileSync, writeFileSync } from 'node:fs'
import { decodePng } from './png'
import type { Label } from './buildData'
import { nodeTextReader } from './ocr'
import { handAt } from '../../src/solver/scan/cards'
import { layout } from '../../src/solver/scan/layout'
import { resize, type Img } from '../../src/solver/scan/pixels'
import { ranked, readTitle, titleCrop } from '../../src/solver/scan/titles'

const opt = (k: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined)
const scale = Number(opt('--scale') ?? 1)
const truth = JSON.parse(readFileSync('scripts/scan/truth.json', 'utf8')) as Record<string, Label>
const cards = JSON.parse(readFileSync('scripts/scan/cards.json', 'utf8')) as Record<string, NonNullable<Label['cards']>>
const items = [
  ...Object.entries(truth).filter(([, l]) => l.state?.hand.length).map(([file, l]) => ({ file, phase: l.state!.phase, hand: l.state!.hand, hover: undefined as number | undefined, blurred: false })),
  ...Object.entries(cards).map(([file, c]) => ({ file, phase: c.phase, hand: c.hand, hover: c.hover, blurred: !!c.blurred })),
].filter(it => it.hand.length)

// one worker, one card at a time, so each card's time is its own
const ocr = await nodeTextReader(1)
type Row = { file: string; slot: number; name: string; phase: string; step: number; ms: number; right: boolean; hover: boolean; blurred: boolean; text: string }
const rows: Row[] = []
for (const it of items) {
  const full = decodePng(readFileSync(`training/${it.file}`))
  const img: Img = scale === 1 ? full : resize(full, Math.round(full.width * scale), Math.round(full.height * scale))
  const l = layout(img)
  const pos = handAt(l, it.hand.length)
  for (let j = 0; j < pos.length; j++) {
    const crop = titleCrop(img, pos[j], l.k)
    const t0 = performance.now()
    const { text, step } = await readTitle(crop, [it.phase], ocr.readText)
    const ms = performance.now() - t0
    rows.push({ file: it.file, slot: j, name: it.hand[j], phase: it.phase, step, ms, right: ranked(it.phase, text)[0][0] === it.hand[j], hover: it.hover === j, blurred: it.blurred, text })
  }
  process.stderr.write(`\r${rows.length} cards`)
}
await ocr.stop()
const out = opt('--out')
if (out) writeFileSync(out, JSON.stringify(rows))

const still = rows.filter(r => !r.hover && !r.blurred)
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1)
console.log(`\n${still.length} still cards (raised and blurred left out), ${(mean(still.map(r => r.ms))).toFixed(0)} ms a card; step 1 settles ${((100 * still.filter(r => r.step === 1).length) / still.length).toFixed(0)}%`)
for (const s of [1, 2, 3, 4]) {
  const at = still.filter(r => r.step === s)
  console.log(`  step ${s}: ${at.length} cards, ${mean(at.map(r => r.ms)).toFixed(0)} ms`)
}
const by = new Map<string, Row[]>()
for (const r of still) by.set(`${r.phase}:${r.name}`, [...(by.get(`${r.phase}:${r.name}`) ?? []), r])
console.log('\ncard\tn\tmean steps\tmean ms\tstep 1 %\twrong')
for (const [k, rs] of [...by].sort((a, b) => mean(b[1].map(r => r.ms)) - mean(a[1].map(r => r.ms))))
  console.log(`${k}\t${rs.length}\t${mean(rs.map(r => r.step)).toFixed(2)}\t${mean(rs.map(r => r.ms)).toFixed(0)}\t${((100 * rs.filter(r => r.step === 1).length) / rs.length).toFixed(0)}\t${rs.filter(r => !r.right).length}`)
