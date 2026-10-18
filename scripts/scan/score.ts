// Scores the screenshot reader against the labelled frames, per field group.
// Each frame is read with reference data built from every other frame (leave-one-out), so a frame never
// helps read itself. Without --quick, every frame is also read rescaled to 0.75x and 1.5x.
// Usage: npx vite-node scripts/scan/score.ts [--quick] [--text] [--by-game]   (--text: cards' printed names read too, as the site does)
import { readFileSync } from 'node:fs'
import { decodePng } from './png'
import { buildData, type Label } from './buildData'
import { resize, type Img } from '../../src/solver/scan/pixels'
import { scan } from '../../src/solver/scan/scan'
import { readTitles } from '../../src/solver/scan/titles'
import { layout } from '../../src/solver/scan/layout'
import { readSlots } from '../../src/solver/scan/cards'
import { nodeTextReader } from './ocr'

const quick = process.argv.includes('--quick')
/** --by-game: read each frame with reference data from the other games only (no same-game help at all) */
const byGame = process.argv.includes('--by-game')
const ocr = process.argv.includes('--text') ? await nodeTextReader() : null
// as the site reads: the board's pixels, the cards' printed names, their pictures only where a name can't be read
const read = async (img: Img, data: ReturnType<typeof buildData>) =>
  ocr
    ? readTitles(img, scan(img, data, {}, { pictures: false }), ocr.readText, async (phase, size, slots) => {
        const { fields, problems, ranks } = readSlots(img, layout(img), size, phase, slots, data)
        return Object.fromEntries(slots.map(j => [j, { ranks: ranks[j], field: fields[`hand${j}`], unknown: problems.some(p => p.kind === 'unknownArt' && p.field === `hand${j}`) }]))
      })
    : scan(img, data)
/** --cards: also print every card's best match and score (name, read, score, runner-up), for tuning */
const dumpCards = process.argv.includes('--cards')
const truth = JSON.parse(readFileSync('scripts/scan/truth.json', 'utf8')) as Record<string, Label>
const frames = Object.entries(truth).filter(([, l]) => l.state).map(([file, label]) => ({ file, label, img: decodePng(readFileSync(`training/${file}`)) }))
// tick frames labelled for their hand only; the ones without a hovered card also teach the reader
const handOnly = Object.entries(JSON.parse(readFileSync('scripts/scan/cards.json', 'utf8')) as Record<string, NonNullable<Label['cards']>>)
  .map(([file, cards]) => ({ file, label: { kind: 'cards', cards } as Label, img: decodePng(readFileSync(`training/${file}`)) }))
const teaching = handOnly.filter(t => t.label.cards!.hover === undefined && !t.label.cards!.blurred)
// the same hand in the same game is the same moment: held out together, so no frame helps read its twin
const game = (file: string) => /^(g\d+)-/.exec(file)?.[1] ?? 'g1'
const moment = (file: string, hand: string[]) => `${game(file)}|${[...hand].sort().join('|')}`
const others = (file: string, hand: string[]) => {
  const m = moment(file, hand)
  return [...frames.filter(o => o.file !== file && (!byGame || game(o.file) !== game(file))), ...teaching.filter(t => !byGame || game(t.file) !== game(file)).filter(t => moment(t.file, t.label.cards!.hand) !== m)].map(o => ({ img: o.img, label: o.label }))
}

type Group = 'tanks' | 'rarity' | 'archetype' | 'numbers' | 'round' | 'phase' | 'hand' | 'refreshes' | 'instruments'
const GROUPS: Group[] = ['tanks', 'rarity', 'archetype', 'numbers', 'round', 'phase', 'hand', 'refreshes', 'instruments']
const scales = quick ? [1] : [1, 0.75, 1.5]
const tally = new Map<number, Record<Group, [number, number]>>(scales.map(s => [s, Object.fromEntries(GROUPS.map(g => [g, [0, 0]])) as Record<Group, [number, number]>]))
const misses: string[] = []
const f2 = (f: { guess?: string; score?: number; second?: number } | undefined, want: string) => `\t${want}\t${f?.guess}\t${f?.score?.toFixed(4)}\t${f?.second?.toFixed(4)}`

for (const f of frames) {
  const data = buildData(others(f.file, f.label.state!.hand))
  for (const s of scales) {
    const img: Img = s === 1 ? f.img : resize(f.img, Math.round(f.img.width * s), Math.round(f.img.height * s))
    const reading = await read(img, data)
    const got = reading.state
    const want = f.label.state!
    const t = tally.get(s)!
    const count = (g: Group, ok: boolean, what: string) => {
      t[g][0] += ok ? 1 : 0
      t[g][1]++
      if (!ok) misses.push(`${f.file} @${s}x ${g}: ${what}`)
    }
    want.tanks.forEach((w, i) => {
      const g = got.tanks[i]
      count('tanks', !w === !g, `tank${i} ${g ? 'filled' : 'empty'}`)
      if (!w || !g) return
      count('rarity', w.rarity === g.rarity, `tank${i} ${g.rarity} not ${w.rarity}`)
      count('archetype', w.archetype === g.archetype, `tank${i} ${g.archetype} not ${w.archetype}`)
      count('numbers', w.activity === g.activity && w.quantity === g.quantity, `tank${i} ${g.activity}x${g.quantity} not ${w.activity}x${w.quantity}`)
    })
    count('round', got.round === want.round, `${got.round} not ${want.round}`)
    count('phase', got.phase === want.phase, `${got.phase} not ${want.phase}`)
    // by slot: a card flagged unknown is dropped from the hand, so the hand list can't be compared by index
    want.hand.forEach((n, j) => {
      const f = reading.fields[`hand${j}`]
      if (dumpCards && s === 1) console.log(`CARD\t${f2(f, n)}`)
      const unknown = reading.problems.some(p => p.kind === 'unknownArt' && p.field === `hand${j}`)
      count('hand', !unknown && f?.guess === n, `card${j} ${unknown ? `unknown (best ${f?.guess})` : f?.guess} not ${n}`)
    })
    if (want.phase !== 'protocol') {
      const key = want.phase === 'potion' ? 'potionRefreshes' : 'instrumentRefreshes'
      count('refreshes', got[key] === want[key], `${got[key]} not ${want[key]}`)
    }
    count('instruments', JSON.stringify(got.instruments) === JSON.stringify(want.instruments), `${got.instruments.join(',')}`)
  }
}

// hands in tick frames: what Live sees, often with the mouse raising one card
const ticks = { still: [0, 0], hovered: [0, 0] }
for (const t of handOnly) {
  const want = t.label.cards!
  const r = await read(t.img, buildData(others(t.file, want.hand)))
  const tally = ticks[want.hover === undefined ? 'still' : 'hovered']
  want.hand.forEach((n, j) => {
    const unknown = r.problems.some(p => p.kind === 'unknownArt' && p.field === `hand${j}`)
    const ok = r.state.phase === want.phase && !unknown && r.fields[`hand${j}`]?.guess === n
    tally[0] += ok ? 1 : 0
    tally[1]++
    if (!ok) misses.push(`${t.file} tick${want.hover !== undefined ? ` hover${want.hover}` : ''}: card${j} ${r.state.phase !== want.phase ? `phase ${r.state.phase}` : unknown ? `unknown (best ${r.fields[`hand${j}`]?.guess})` : r.fields[`hand${j}`]?.guess} not ${n}`)
  })
}

console.log(`${frames.length} labelled frames, leave-one-out\n`)
console.log(`| Scale | ${GROUPS.join(' | ')} |`)
console.log(`| --- |${GROUPS.map(() => ' --- |').join('')}`)
for (const [s, t] of tally) console.log(`| ${s}x | ${GROUPS.map(g => (t[g][1] ? `${Math.round((100 * t[g][0]) / t[g][1])}%` : '–')).join(' | ')} |`)
const pct = ([a, b]: number[]) => `${Math.round((100 * a) / b)}% of ${b}`
console.log(`\nTick frames, cards: ${pct(ticks.still)} still, ${pct(ticks.hovered)} with a card hovered`)
await ocr?.stop()
if (misses.length) console.log(`\nMisses:\n${misses.join('\n')}`)
