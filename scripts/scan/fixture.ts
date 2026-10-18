// Makes small test fixtures from labelled frames: only the parts the reader looks at are kept, the rest
// is black, so a 3440x1440 frame compresses to a few hundred KB. --blank-card N also blacks out card N's
// art and title, for testing an unrecognised card.
// Usage: npx vite-node scripts/scan/fixture.ts training/012-board.png tests/fixtures/frames/board.png [--blank-card 1]
import { readFileSync, writeFileSync } from 'node:fs'
import { decodePng, encodePng } from './png'
import { layout } from '../../src/solver/scan/layout'
import type { Rect } from '../../src/solver/types'

const [src, out] = process.argv.slice(2)
const blank = process.argv.includes('--blank-card') ? Number(process.argv[process.argv.indexOf('--blank-card') + 1]) : -1
const img = decodePng(readFileSync(src))
const l = layout(img)
const keep: Rect[] = [...l.icon, ...l.nameBand, ...l.totalBand, ...l.aqBand, ...l.cardFace, l.header, l.refresh, l.round, ...l.instrumentIcon]
const mask = new Uint8Array(img.width * img.height)
const mark = (r: Rect, v: number) => {
  for (let y = Math.max(0, Math.floor(r.y) - 4); y < Math.min(img.height, r.y + r.h + 4); y++)
    for (let x = Math.max(0, Math.floor(r.x) - 4); x < Math.min(img.width, r.x + r.w + 4); x++) mask[y * img.width + x] = v
}
keep.forEach(r => mark(r, 1))
if (blank >= 0) {
  mark(l.cardArt[blank], 0)
  // the text block under the art
  const c = l.cards[blank]
  mark({ x: c.cx - 105 * l.k, y: c.cy - 50 * l.k, w: 190 * l.k, h: 180 * l.k }, 0)
}
for (let i = 0; i < mask.length; i++) if (!mask[i]) img.data.set([0, 0, 0, 255], i * 4)
writeFileSync(out, encodePng(img))
