// Trial: how far a card's picture can be trusted on its own, so its printed name needn't be read. Each labelled
// card is matched by its picture (art and text shape, as readSlots does) with reference data from the other games
// only, and its best score and lead over the next card are kept. Prints, for a range of score/lead bars, how many
// cards clear the bar and how many of those are wrong; still and raised (hovered) cards apart.
// Usage: npx vite-node scripts/scan/pictureFirst.ts [--scales 1,0.75,1.5]  (writes training/pictureFirst.json)
import { readFileSync, writeFileSync } from 'node:fs'
import { decodePng } from './png'
import { buildData, type Label } from './buildData'
import { readSlots } from '../../src/solver/scan/cards'
import { layout } from '../../src/solver/scan/layout'
import { resize, type Img } from '../../src/solver/scan/pixels'

const arg = process.argv.indexOf('--scales')
const scales = arg > 0 ? process.argv[arg + 1].split(',').map(Number) : [1]
const truth = JSON.parse(readFileSync('scripts/scan/truth.json', 'utf8')) as Record<string, Label>
const cards = JSON.parse(readFileSync('scripts/scan/cards.json', 'utf8')) as Record<string, NonNullable<Label['cards']>>
const game = (file: string) => /^([a-z]\d+)-/.exec(file)?.[1] ?? 'g1'

const frames = Object.entries(truth).filter(([, l]) => l.state).map(([file, label]) => ({ file, label, img: decodePng(readFileSync(`training/${file}`)) }))
const ticks = Object.entries(cards).map(([file, c]) => ({ file, label: { kind: 'cards', cards: c } as Label, img: decodePng(readFileSync(`training/${file}`)) }))
const teaching = ticks.filter(t => t.label.cards!.hover === undefined && !t.label.cards!.blurred)
const items = [
  ...frames.map(f => ({ ...f, phase: f.label.state!.phase, hand: f.label.state!.hand, hover: undefined as number | undefined, blurred: false })),
  ...ticks.map(t => ({ ...t, phase: t.label.cards!.phase, hand: t.label.cards!.hand, hover: t.label.cards!.hover, blurred: !!t.label.cards!.blurred })),
].filter(it => it.hand.length)

type Sample = { file: string; scale: number; slot: number; want: string; got?: string; score: number; second: number; hover: boolean; blurred: boolean; ms: number }
const samples: Sample[] = []
for (const g of [...new Set(items.map(it => game(it.file)))]) {
  const data = buildData([...frames, ...teaching].filter(o => game(o.file) !== g).map(o => ({ img: o.img, label: o.label })))
  for (const it of items.filter(it => game(it.file) === g))
    for (const s of scales) {
      const img: Img = s === 1 ? it.img : resize(it.img, Math.round(it.img.width * s), Math.round(it.img.height * s))
      const slots = it.hand.map((_, j) => j)
      const t0 = performance.now()
      const { fields } = readSlots(img, layout(img), it.hand.length, it.phase, slots, data)
      const ms = (performance.now() - t0) / slots.length
      slots.forEach(j => {
        const f = fields[`hand${j}`]
        samples.push({ file: it.file, scale: s, slot: j, want: it.hand[j], got: f?.guess, score: f?.score ?? 0, second: f?.second ?? 0, hover: it.hover === j, blurred: it.blurred, ms })
      })
    }
  console.error(`${g}: ${samples.length} cards so far`)
}
// every card's best score and lead, for a closer look (git-ignored)
writeFileSync('training/pictureFirst.json', JSON.stringify(samples))

const ok = (s: Sample) => s.got === s.want
for (const [name, set] of [['still', samples.filter(s => !s.hover && !s.blurred)], ['raised', samples.filter(s => s.hover)], ['blurred', samples.filter(s => s.blurred)]] as const) {
  console.log(`\n== ${name}: ${set.length} cards, best match right ${set.filter(ok).length}; ${(set.reduce((a, s) => a + s.ms, 0) / set.length).toFixed(1)} ms a card`)
  for (const min of [0.95, 0.96, 0.97, 0.98])
    for (const gap of [0.015, 0.02, 0.03, 0.04, 0.05]) {
      const pass = set.filter(s => s.score >= min && s.score - s.second >= gap)
      console.log(`score >= ${min} lead >= ${gap}: ${pass.length} taken (${((100 * pass.length) / set.length).toFixed(0)}%), ${pass.filter(s => !ok(s)).length} wrong`)
    }
}
