// Labels a game's frames by their hands, read the way the site reads them, for the reader to learn from:
// only frames whose every card name the text reader settled. A card the mouse raised is marked (hover) and
// kept out of the picture examples; the equipped instruments come from the instrument tracker. Labels
// already in scripts/scan/cards.json are kept as they are. A frame where a resting card fits its own
// pictures poorly (a flash of light as cards are dealt) is marked blurred, and teaches no pictures either.
// Usage: npx vite-node scripts/scan/autolabel.ts <folder under training/> [...]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { decodePng } from './png'
import { nodeTextReader } from './ocr'
import type { Label } from './buildData'
import { scan } from '../../src/solver/scan/scan'
import { readTitles } from '../../src/solver/scan/titles'
import { fitOffset, handAt, readSlots } from '../../src/solver/scan/cards'
import { layout } from '../../src/solver/scan/layout'
import { newTracker, trackInstruments } from '../../src/solver/track'
import data from '../../src/solver/scan/data.json'
import { unpack, type PackedScanData } from '../../src/solver/scan/data'

const D = unpack(data as unknown as PackedScanData)
/** a raised card fits its references this much higher (reference px) */
const RAISED = -20
/** a resting card fitting its own pictures worse than this is blurred */
const CLEAR = 0.9
/** a printed name's fit, against a picture's score of at most 1 */
const BY_NAME = 6

const labels = JSON.parse(readFileSync('scripts/scan/cards.json', 'utf8')) as Record<string, NonNullable<Label['cards']>>
const ocr = await nodeTextReader()
let added = 0
for (const dir of process.argv.slice(2)) {
  let tracker = newTracker()
  for (const f of readdirSync(`training/${dir}`).filter(n => n.endsWith('.png')).sort()) {
    const file = `${dir}/${f}`
    const img = decodePng(readFileSync(`training/${file}`))
    const l = layout(img)
    const r = await readTitles(img, scan(img, D, {}, { pictures: false }), ocr.readText, async (phase, size, slots) => {
      const { fields, problems, ranks } = readSlots(img, l, size, phase, slots, D)
      return Object.fromEntries(slots.map(j => [j, { ranks: ranks[j], field: fields[`hand${j}`], unknown: problems.some(p => p.kind === 'unknownArt' && p.field === `hand${j}`) }]))
    })
    if (r.problems.some(p => p.kind === 'notFound' || p.kind === 'animating')) continue
    const t = trackInstruments(tracker, r, f.includes('screen') ? 'screen' : 'board')
    tracker = t.tracker
    const size = r.handRanks?.length ?? 0
    const names = Array.from({ length: size }, (_, j) => r.fields[`hand${j}`])
    if (!size || labels[file] || !names.every(n => n?.sure && (n.score ?? 0) >= BY_NAME)) continue
    const pos = handAt(l, size)
    const fits = names.map((n, j) => fitOffset(img, pos[j], l.k, `${r.state.phase}:${n!.guess}`, D))
    const hover = fits.findIndex(fit => (fit?.at[1] ?? 0) <= RAISED)
    const blurred = fits.some((fit, j) => j !== hover && fit && fit.score < CLEAR)
    const instrumentsSure = Object.entries(t.fields).every(([, v]) => v.sure)
    labels[file] = {
      phase: r.state.phase,
      hand: names.map(n => n!.guess!),
      ...(hover >= 0 ? { hover } : {}),
      ...(blurred ? { blurred: true as const } : {}),
      ...(instrumentsSure ? { instruments: t.instruments } : {}),
    }
    added++
  }
}
await ocr.stop()
writeFileSync('scripts/scan/cards.json', JSON.stringify(Object.fromEntries(Object.entries(labels).sort()), null, 1) + '\n')
console.log(`${added} frames labelled`)
