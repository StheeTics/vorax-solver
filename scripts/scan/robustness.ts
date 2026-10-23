// How well the reader copes with pictures unlike the ones it was built from: labelled live frames (training/,
// scripts/scan/truth.json) turned into what failing players' pictures look like (a windowed game's title bar in
// other colours, a lower render scale's blur, other brightness), read the way the Solver reads a picture (the
// game found in a window, then scan), and scored against the labels: a field counts only when it's right AND sure.
// Usage: npx vite-node scripts/scan/robustness.ts [frames, default 30] [transform names, comma-separated]
import { existsSync, readFileSync } from 'node:fs'
import { decodePng } from './png'
import type { Label } from './buildData'
import { scan } from '@/solver/scan/scan'
import { resize, type Img } from '@/solver/scan/pixels'
import { cropTo, windowedGame } from '@/solver/live/windowCrop'
import raw from '@/solver/scan/data.json'
import { unpack, type PackedScanData } from '@/solver/scan/data'

const data = unpack(raw as unknown as PackedScanData)
const truth = JSON.parse(readFileSync('scripts/scan/truth.json', 'utf8')) as Record<string, Label>

const map = (img: Img, f: (v: number) => number): Img => {
  const lut = Uint8ClampedArray.from({ length: 256 }, (_, v) => f(v))
  const d = new Uint8ClampedArray(img.data)
  for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = lut[d[i + c]]
  return { width: img.width, height: img.height, data: d }
}
/** a lower render scale: drawn smaller, then stretched back up */
const renderScale = (img: Img, s: number) => resize(resize(img, Math.round(img.width * s), Math.round(img.height * s)), img.width, img.height)
/** the game in a window: an edge, a title bar of one colour, the edge on every side, the capture shrunk to fit the game's height */
function windowed(img: Img, title: [number, number, number], edge: number, edgeColour: [number, number, number], titleH = 31): Img {
  const W = img.width + 2 * edge, H = img.height + titleH + 2 * edge
  const d = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    const gx = x - edge, gy = y - edge - titleH
    let c: number[]
    if (gx >= 0 && gy >= 0 && gx < img.width && gy < img.height) {
      const j = (gy * img.width + gx) * 4
      c = [img.data[j], img.data[j + 1], img.data[j + 2]]
    } else if (y >= edge && y < edge + titleH && x >= edge && x < W - edge) c = title
    else c = edgeColour
    d.set([c[0], c[1], c[2], 255], i)
  }
  const shrunk = { width: W, height: H, data: d }
  return resize(shrunk, Math.round((W * img.height) / H), img.height)
}

const TRANSFORMS: Record<string, (img: Img) => Img> = {
  as_is: img => img,
  render_85: img => renderScale(img, 0.85),
  render_70: img => renderScale(img, 0.7),
  render_50: img => renderScale(img, 0.5),
  darker: img => map(img, v => v * 0.75),
  brighter: img => map(img, v => 255 * Math.pow(v / 255, 0.75)),
  gamma_dark: img => map(img, v => 255 * Math.pow(v / 255, 1.35)),
  washed: img => map(img, v => 40 + v * 0.8),
  win11_dark: img => windowed(img, [32, 32, 32], 1, [60, 60, 60]),
  win11_light: img => windowed(img, [243, 243, 243], 1, [170, 170, 170]),
  win_accent: img => windowed(img, [0, 95, 184], 1, [0, 70, 140]),
  win_no_edge: img => windowed(img, [32, 32, 32], 0, [32, 32, 32]),
  win10_white: img => windowed(img, [255, 255, 255], 1, [24, 131, 215], 30),
}

/** What the Solver reads from a picture (SolverApp's onFrame): the game in a window, then the board. framed: in
 *  the app, Windows says the game's window has a frame (the windowed transforms) */
function readLike(img: Img, framed: boolean) {
  const area = windowedGame(img, framed)
  return scan((area ? cropTo(img, area) : img) as Img, data)
}

function score(r: ReturnType<typeof scan>, want: NonNullable<Label['state']>) {
  let tanks = 0, tanksOk = 0, tanksWrong = 0
  want.tanks.forEach((t, i) => {
    if (!t) return
    tanks++
    const got = r.state.tanks[i]
    const sure = r.fields[`tank${i}.activity`]?.sure && r.fields[`tank${i}.quantity`]?.sure
    const right = !!got && got.activity === t.activity && got.quantity === t.quantity
    if (sure && right) tanksOk++
    // worse than unsure: the Solver would trust it
    if (sure && !right) tanksWrong++
  })
  const roundOk = !!r.fields.round?.sure && r.state.round === want.round
  const handOk = JSON.stringify(r.state.hand) === JSON.stringify(want.hand)
  return { tanks, tanksOk, tanksWrong, roundOk, handOk }
}

{
  const n = Number(process.argv[2] ?? 30)
  const only = process.argv[3]?.split(',')
  const files = Object.entries(truth).filter(([f, l]) => l.state && existsSync(`training/${f}`))
  // an even spread over the labelled games, both screen shapes
  const step = Math.max(1, Math.floor(files.length / n))
  const picked = files.filter((_, i) => i % step === 0).slice(0, n)
  console.log(`${picked.length} frames`)
  for (const [name, t] of Object.entries(TRANSFORMS)) {
    if (only && !only.includes(name)) continue
    let tanks = 0, tanksOk = 0, tanksWrong = 0, rounds = 0, hands = 0
    const t0 = Date.now()
    for (const [file, label] of picked) {
      const s = score(readLike(t(decodePng(readFileSync(`training/${file}`))), name.startsWith('win')), label.state!)
      tanks += s.tanks
      tanksOk += s.tanksOk
      tanksWrong += s.tanksWrong
      rounds += +s.roundOk
      hands += +s.handOk
    }
    const pct = (a: number, b: number) => `${Math.round((100 * a) / b)}%`.padStart(4)
    console.log(`${name.padEnd(12)} tanks right and sure ${pct(tanksOk, tanks)} (wrong but sure ${tanksWrong})   round ${pct(rounds, picked.length)}   hand ${pct(hands, picked.length)}   (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
  }
}
