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

/** How bright a name must be to be there at all: names measure 119 or more even shrunk to 1080p, empty
 *  tanks (dark glass) 88 or less. */
const NAME_MIN = 105
const DIGIT_MIN = 0.75

/** The engine's cap on Activity and Quantity (src/ui/sandboxValidate.ts). */
const MAX_STAT = 1_000_000

/** Activity x Quantity from their line, kept within the game, and whether they multiply to the total. */
export function stats(total: string | undefined, aq: string | undefined): { activity: number; quantity: number; fits: boolean } {
  const parts = (aq ?? '').split('x')
  const [a, q] = parts.length === 2 ? parts.map(Number) : [NaN, NaN]
  const ok = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_STAT
  if (!ok(a) || !ok(q)) return { activity: 1, quantity: 1, fits: false }
  return { activity: a, quantity: q, fits: a * q === Number(total) }
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

/** All readings of a line from its candidates, with how far down each glyph's list it went. */
function readings(alts: Alts): { text: string; rank: number }[] {
  if (alts.reduce((n, a) => n * a.length, 1) > MAX_COMBOS) return []
  let out: { text: string; rank: number }[] = [{ text: '', rank: 0 }]
  for (const choices of alts) out = out.flatMap(o => choices.map((c, i) => ({ text: o.text + c, rank: o.rank + i })))
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
  const text = totalFits.length ? best(totalFits) : null
  return text === null ? null : { total: text, aq: aqText }
}

export interface TankRead { monster: ScreenMonster | null; fields: Record<string, FieldRead> }

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
  if (Math.max(...rgb) < NAME_MIN) return { monster: null, fields: { [`tank${i}.empty`]: { sure: true } } }

  const { rarity, sure } = rarityOf(rgb)
  fields[`tank${i}.rarity`] = { sure, guess: rarity }

  const { archetype, sure: archetypeSure } = archetypeOf(img, l.icon[i])
  fields[`tank${i}.archetype`] = { sure: archetypeSure, guess: archetype }

  const total = readText(img, g, l.totalBand[i], 'label', data.digits.label)
  const aq = readText(img, g, l.aqBand[i], 'label', data.digits.label)
  let st = stats(total?.text, aq?.text)
  // a digit beside the heart icon can be misread: the total decides which next-best digits are right
  const fix = !st.fits && total && aq ? reconcile(total.alts, aq.alts) : null
  if (fix) st = stats(fix.total, fix.aq)
  // numbers that multiply to the total are right whatever the glyph scores: the check is too strict to pass by chance
  const fits = st.fits && !!total && !!aq && (!!fix || (total.score >= DIGIT_MIN && aq.score >= DIGIT_MIN))
  fields[`tank${i}.activity`] = { sure: fits, guess: String(st.activity), score: aq?.score, second: aq?.second }
  fields[`tank${i}.quantity`] = { sure: fits, guess: String(st.quantity), score: aq?.score, second: aq?.second }
  return { monster: { archetype, rarity, activity: st.activity, quantity: st.quantity }, fields }
}
