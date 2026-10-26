// Small A x Q lines whose digits touch: the total's factor pairs, each laid over the line's pixels at its best cuts.
import type { Rect } from '../types'
import { glyphVector, type Img } from './pixels'
import { glyphs } from './text'

const pairsOf = (total: number): string[] => {
  const out: string[] = []
  for (let a = 1; a <= total; a++) if (total % a === 0) out.push(`${a}x${total / a}`)
  return out
}

/** How well a line's lit columns read as `text`: its characters laid over the line at their best cuts. */
export function fitText(img: Img, g: Float32Array, line: Rect, refs: Record<string, number[][]>, text: string): number {
  const n = text.length
  const x0 = Math.round(line.x), x1 = Math.round(line.x + line.w)
  const W = x1 - x0
  const minW = Math.max(1, Math.floor(line.h * 0.2)), maxW = Math.ceil(line.h * 0.9)
  if (W < n * minW || W > n * (maxW + 1)) return -Infinity
  const memo = new Map<string, number>()
  const match = (ch: string, a: number, b: number) => {
    const key = `${ch}${a},${b}`
    let s = memo.get(key)
    if (s === undefined) {
      const v = glyphVector(g, img.width, img.height, { x: a, y: line.y, w: b - a, h: line.h }, line.h)
      s = Math.max(...refs[ch].map(ref => ref.reduce((t, x, i) => t + x * v[i], 0)))
      memo.set(key, s)
    }
    return s
  }
  // best[k][x]: the best summed score of the first k characters ending at column x
  let best = new Map<number, number>([[x0, 0]])
  for (let k = 0; k < n; k++) {
    const next = new Map<number, number>()
    for (const [a, s] of best) for (let w = minW; w <= maxW; w++) for (const gap of [0, 1]) {
      const b = a + w
      if (b > x1) continue
      const t = s + match(text[k], a, b)
      const end = Math.min(x1, b + gap)
      if (t > (next.get(end) ?? -Infinity)) next.set(end, t)
    }
    best = next
  }
  return (best.get(x1) ?? -Infinity) / n
}

/** The Activity x Quantity pairs of a total ranked by how well each fits the line's pixels. */
export function fitLine(img: Img, g: Float32Array, band: Rect, refs: Record<string, number[][]>, total: number): { text: string; score: number }[] {
  const gs = glyphs(img, band, 'label')
  if (!gs.length || total > 1_000_000) return []
  const y0 = Math.min(...gs.map(b => b.y)), y1 = Math.max(...gs.map(b => b.y + b.h))
  const line = { x: gs[0].x, y: y0, w: gs[gs.length - 1].x + gs[gs.length - 1].w - gs[0].x, h: y1 - y0 }
  return pairsOf(total).map(text => ({ text, score: fitText(img, g, line, refs, text) })).filter(c => c.score > -Infinity).sort((a, b) => b.score - a.score)
}
