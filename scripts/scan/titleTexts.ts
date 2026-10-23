// Every labelled card's title as the text reader reads it at each of readTitle's steps (titles.ts): step 1 the
// title window, step 2 the title area at half size, step 3 at full size. Written to a JSON file, so rules for
// settling a name can be tried on all of them without reading again (scripts/scan/titleRules.ts).
// Usage: npx vite-node scripts/scan/titleTexts.ts <out.json> [--scale 1.3333]
import { readFileSync, writeFileSync } from 'node:fs'
import { decodePng } from './png'
import type { Label } from './buildData'
import { nodeTextReader } from './ocr'
import { handAt } from '../../src/solver/scan/cards'
import { layout } from '../../src/solver/scan/layout'
import { resize, type Img } from '../../src/solver/scan/pixels'
import { titleCrop, titleWindow } from '../../src/solver/scan/titles'

const out = process.argv[2]
const scale = process.argv.includes('--scale') ? Number(process.argv[process.argv.indexOf('--scale') + 1]) : 1
const truth = JSON.parse(readFileSync('scripts/scan/truth.json', 'utf8')) as Record<string, Label>
const cards = JSON.parse(readFileSync('scripts/scan/cards.json', 'utf8')) as Record<string, NonNullable<Label['cards']>>
const items = [
  ...Object.entries(truth).filter(([, l]) => l.state?.hand.length).map(([file, l]) => ({ file, phase: l.state!.phase, hand: l.state!.hand, hover: undefined as number | undefined, blurred: false })),
  ...Object.entries(cards).map(([file, c]) => ({ file, phase: c.phase, hand: c.hand, hover: c.hover, blurred: !!c.blurred })),
].filter(it => it.hand.length)

const ocr = await nodeTextReader(3)
const rows: { file: string; slot: number; name: string; phase: string; hover: boolean; blurred: boolean; texts: (string | null)[] }[] = []
for (const it of items) {
  const full = decodePng(readFileSync(`training/${it.file}`))
  const img: Img = scale === 1 ? full : resize(full, Math.round(full.width * scale), Math.round(full.height * scale))
  const l = layout(img)
  await Promise.all(handAt(l, it.hand.length).map(async (pos, j) => {
    const crop = titleCrop(img, pos, l.k)
    const w = titleWindow(crop)
    const read = (i: Img) => ocr.readText(i).catch(() => '')
    const texts = await Promise.all([w ? read(w) : Promise.resolve(null), read(resize(crop, Math.round(crop.width / 2), Math.round(crop.height / 2))), read(crop)])
    rows.push({ file: it.file, slot: j, name: it.hand[j], phase: it.phase, hover: it.hover === j, blurred: it.blurred, texts })
  }))
  process.stderr.write(`\r${rows.length} cards`)
}
await ocr.stop()
writeFileSync(out, JSON.stringify(rows))
console.log(`\n${rows.length} cards written to ${out}`)
