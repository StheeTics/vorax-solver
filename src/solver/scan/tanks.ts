// One tank from its label: empty or not, rarity from the name's colour, archetype from the icon above it,
// and Activity x Quantity, which must multiply to the total shown above it.
import type { Archetype, Rarity } from '@/engine/types'
import type { ScreenMonster } from '@/strategy/advisor'
import type { FieldRead, Rect } from '../types'
import type { ScanData } from './data'
import type { Layout } from './layout'
import { hsv, type Img } from './pixels'
import { readText } from './digits'
import { brightest } from './text'

/** How bright a name must be to be there at all: on the labelled frames names measure 120 or more, and still
 *  97 or more blurred by a 50% render scale; empty tanks (dark glass) 90 or less, blurred or not. */
const NAME_MIN = 94
/** An empty tank's plate lit by its red glass, at the lowest interface scale (Oct 23, two players: 112-113 red, 35-48
 *  green): dim and deep red. Boss names, the reddest, measure 191 red and 89 green at the least (407 labelled names). */
const GLOW_RED = 150
const GLOW_GREEN = 70
/** At the highest interface scale the name's place reaches the tank stand's rim, which an empty tank's glass lights a
 *  dim pink (Oct 25, 3440x1440: 130 red, 83 green, 98 blue): red the strongest, blue over green, well tinted, and too dim
 *  for a Boss. No name is that colour: Normal is grey (tint under 0.18), Magic blue, Rare gold (green over blue). */
const RIM_TINT = 0.25
const emptyGlow = ([r, g, b]: [number, number, number]) => r < GLOW_RED && ((g < GLOW_GREEN) || (r >= b && b > g && (r - g) / r >= RIM_TINT))
const DIGIT_MIN = 0.75

/** The engine's cap on Activity and Quantity (src/ui/sandboxValidate.ts). */
const MAX_STAT = 1_000_000

/** Activity x Quantity from their line, kept within the game, and whether they multiply to the total. */
export function stats(total: string | undefined, aq: string | undefined): { activity: number; quantity: number; fits: boolean } {
  const parts = (aq ?? '').split('x')
  // the game writes no leading zeros: a reading that needs one ("139x08") is a misread
  const number = (s: string | undefined) => (s !== undefined && /^[1-9]\d*$/.test(s) ? Number(s) : NaN)
  const [a, q] = parts.length === 2 ? parts.map(number) : [NaN, NaN]
  const ok = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_STAT
  if (!ok(a) || !ok(q)) return { activity: 1, quantity: 1, fits: false }
  return { activity: a, quantity: q, fits: a * q === number(total) }
}

/**
 * Archetype from the little icon above a tank's name, by colour: yellow helmet Bone Sentry, purple swirl
 * Pest, pale blue swirl Aemberon, red sun Agito. The red glass behind every icon is ignored, so "no other
 * colour" means the Agito. Right on all 138 labelled tanks.
 */
export function archetypeOf(img: Img, r: Rect): { archetype: Archetype; sure: boolean } {
  const n = { boneSentry: 0, pest: 0, aemberon: 0 }
  for (let y = Math.max(0, Math.floor(r.y)); y < Math.min(img.height, r.y + r.h); y++) {
    for (let x = Math.max(0, Math.floor(r.x)); x < Math.min(img.width, r.x + r.w); x++) {
      const i = (y * img.width + x) * 4
      const [h, s, v] = hsv(img.data[i], img.data[i + 1], img.data[i + 2])
      if (v < 0.45) continue
      if (h >= 35 && h <= 65 && s >= 0.5) n.boneSentry++
      else if (h >= 255 && h <= 305 && s >= 0.5) n.pest++
      else if (h >= 190 && h <= 240 && s >= 0.25) n.aemberon++
    }
  }
  const [best, count] = (Object.entries(n) as [Archetype, number][]).sort((a, b) => b[1] - a[1])[0]
  if (count >= 4) return { archetype: best, sure: true }
  if (count >= 2) return { archetype: best, sure: false }
  return { archetype: 'agito', sure: true }
}

/** Candidate characters for each glyph of a line, best first: from the digit matcher. */
type Alts = string[][]

/** Most readings tried when working out which of a line's candidate characters make the numbers fit. */
const MAX_COMBOS = 200_000

/** Other brightness cuts tried when the lines don't fit: blurred text (a lower render scale) runs digits
 *  together under the usual one, and a stricter cut parts them. */
const RETRY_CUTS = [0.85, 1, 0.55]

/** Most stray glyphs dropped from one end of a line: a cursor over the label read as "21" (1x36 as 1x3621). */
const MAX_STRAY = 2

/** Most glyphs of a line taken from their next-best characters: a digit or two smudged by the heart icon, not
 *  a line rewritten (blurred glyphs have many near candidates: "180x64" became "139x08" to fit a misread total) */
const MAX_SWAPS = 2

/** All readings of a line from its candidates, with how far down each glyph's list it went. */
function readings(alts: Alts): { text: string; rank: number }[] {
  if (alts.reduce((n, a) => n * a.length, 1) > MAX_COMBOS) return []
  let out: { text: string; rank: number; swaps: number }[] = [{ text: '', rank: 0, swaps: 0 }]
  for (const choices of alts) out = out.flatMap(o => choices.map((c, i) => ({ text: o.text + c, rank: o.rank + i, swaps: o.swaps + (i ? 1 : 0) }))).filter(o => o.swaps <= MAX_SWAPS)
  return out
}

/**
 * When Activity x Quantity doesn't make the total, one line has a misread digit (a digit touching the heart
 * icon can look like another). Tries each glyph's next-best characters, on the Activity x Quantity line first
 * (the total's digits are sharper), and returns the lines that fit, or null when nothing fits or two readings
 * fit equally well.
 */
export function reconcile(total: Alts, aq: Alts): { total: string; aq: string } | null {
  const first = (a: Alts) => a.map(c => c[0]).join('')
  const best = (cands: { text: string; rank: number }[]) => {
    const lowest = Math.min(...cands.map(c => c.rank))
    const top = cands.filter(c => c.rank === lowest)
    return top.length === 1 ? top[0].text : null
  }
  const totalText = first(total)
  const aqFits = readings(aq).filter(r => stats(totalText, r.text).fits)
  if (aqFits.length) {
    const text = best(aqFits)
    return text === null ? null : { total: totalText, aq: text }
  }
  const aqText = first(aq)
  const totalFits = readings(total).filter(r => stats(r.text, aqText).fits)
  if (totalFits.length) {
    const text = best(totalFits)
    return text === null ? null : { total: text, aq: aqText }
  }
  // a sliver of the heart, or a cursor over the label, can pass as a glyph or two more at either end of a
  // line: dropped if the rest then fits, the fewest first
  for (let n = 1; n <= MAX_STRAY; n++) {
    const ends = (s: string) => (s.length > n ? [s.slice(n), s.slice(0, -n)] : [])
    const trimmed = [...ends(aqText).filter(t => stats(totalText, t).fits).map(t => ({ total: totalText, aq: t })), ...ends(totalText).filter(t => stats(t, aqText).fits).map(t => ({ total: t, aq: aqText }))]
    if (trimmed.length === 1) return trimmed[0]
    if (trimmed.length > 1) return null
  }
  // a digit squeezed against the heart can be misread beyond its candidates: with the total and one number
  // read, the other is their quotient, taken only if it has as many digits and differs in just one
  const [a, q] = aqText.split('x')
  const total$ = Number(totalText)
  if (!a || !q || !Number.isInteger(total$)) return null
  const oneOff = (read: string, want: number) => String(want).length === read.length && [...read].filter((c, i) => c !== String(want)[i]).length === 1
  const fromQ = Number(q) > 0 && total$ % Number(q) === 0 && oneOff(a, total$ / Number(q)) ? `${total$ / Number(q)}x${q}` : null
  const fromA = Number(a) > 0 && total$ % Number(a) === 0 && oneOff(q, total$ / Number(a)) ? `${a}x${total$ / Number(a)}` : null
  const fixed = fromQ && fromA ? null : fromQ ?? fromA
  return fixed && stats(totalText, fixed).fits ? { total: totalText, aq: fixed } : null
}

export interface TankRead { monster: ScreenMonster | null; fields: Record<string, FieldRead>; debug: { rgb: [number, number, number]; total: string; aq: string } | null }

/**
 * Rarity from a name's colour. Measured on live frames: Normal is greyish white (saturation under 0.18, a
 * little pink from the glass), Magic pale blue (hue 200-210, saturation ~0.24), Rare gold (hue ~36, ~0.5)
 * and Boss red. A faint blue between Normal and Magic is left unsure.
 */
export function rarityOf(rgb: [number, number, number]): { rarity: Rarity; sure: boolean } {
  const [h, s] = hsv(...rgb)
  if (s >= 0.35) {
    if (h >= 15 && h <= 70) return { rarity: 'rare', sure: true }
    if (h < 15 || h > 330) return { rarity: 'boss', sure: true }
    return { rarity: 'magic', sure: h >= 180 && h <= 240 }
  }
  if (h >= 180 && h <= 240) return s >= 0.15 ? { rarity: 'magic', sure: true } : { rarity: s >= 0.12 ? 'magic' : 'normal', sure: false }
  return { rarity: 'normal', sure: true }
}

export function readTank(img: Img, g: Float32Array, l: Layout, i: number, data: ScanData): TankRead {
  const fields: Record<string, FieldRead> = {}
  const rgb = brightest(img, l.nameBand[i])
  if (Math.max(...rgb) < NAME_MIN || emptyGlow(rgb)) return { monster: null, fields: { [`tank${i}.empty`]: { sure: true } }, debug: null }

  const { rarity, sure } = rarityOf(rgb)
  fields[`tank${i}.rarity`] = { sure, guess: rarity }

  const { archetype, sure: archetypeSure } = archetypeOf(img, l.icon[i])
  fields[`tank${i}.archetype`] = { sure: archetypeSure, guess: archetype }

  const read = (cut?: number) => {
    const total = readText(img, g, l.totalBand[i], 'label', data.digits.label, cut)
    const aq = readText(img, g, l.aqBand[i], 'label', data.digits.label, cut)
    let st = stats(total?.text, aq?.text)
    // a digit beside the heart icon can be misread: the total decides which next-best digits are right
    const fix = !st.fits && total && aq ? reconcile(total.alts, aq.alts) : null
    if (fix) st = stats(fix.total, fix.aq)
    return { total, aq, st, fix }
  }
  let r = read()
  // kept only when Activity x Quantity makes the total as read, with no digits swapped for their next best: blurred
  // glyphs have many near candidates, and some combination of them can make a misread total by chance
  for (const cut of RETRY_CUTS) {
    if (r.st.fits) break
    const again = read(cut)
    if (again.st.fits && !again.fix) r = again
  }
  const { total, aq, st, fix } = r
  // numbers that multiply to the total are right whatever the glyph scores: the check is too strict to pass by chance
  const fits = st.fits && !!total && !!aq && (!!fix || (total.score >= DIGIT_MIN && aq.score >= DIGIT_MIN))
  fields[`tank${i}.activity`] = { sure: fits, guess: String(st.activity), score: aq?.score, second: aq?.second }
  fields[`tank${i}.quantity`] = { sure: fits, guess: String(st.quantity), score: aq?.score, second: aq?.second }
  const debug = { rgb: rgb.map(Math.round) as [number, number, number], total: total?.text ?? '', aq: aq?.text ?? '' }
  return { monster: { archetype, rarity, activity: st.activity, quantity: st.quantity }, fields, debug }
}
