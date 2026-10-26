// The cards on offer: which kind of pick it is (from the header), and each card from its art and the shape
// of its text block (title and body). Cards that share a bottle (Twin Hormone - Pest and - Bone Sentry, ...)
// differ in their text: "Pests" or "Bone Sentries", and the archetype icon beside it.
import type { FieldRead, Problem } from '../types'
import type { HandPhase, ScanData } from './data'
import { CARD_LOCAL, cardFace, type CardPos, type Layout } from './layout'
import { artFeature, gray, hsv, patch, signature, similarity, type ArtFeature, type Img } from './pixels'

const HEADER_MIN = 0.6
const ART_MIN = 0.95
const ART_GAP = 0.015
const ART_UNKNOWN = 0.92

/** The text block's grid: fine enough for the words, coarse enough to forgive a few pixels. */
export const TEXT = { w: 40, h: 38 }

const whole = (r: { w: number; h: number }) => ({ x: 0, y: 0, w: r.w, h: r.h })

/** A card's art, straightened and at reference size, whatever the screen; dx, dy shift it (reference px). */
export function cardArt(img: Img, c: CardPos, k: number, dx = 0, dy = 0): ArtFeature {
  return artFeature(patch(img, c.cx + dx * k, c.cy + dy * k, c.angle, CARD_LOCAL.art, k), whole(CARD_LOCAL.art))
}

/** A card's text block (title and body) as a shape, straightened and at reference size. */
export function cardText(img: Img, c: CardPos, k: number, dx = 0, dy = 0): number[] {
  return signature(patch(img, c.cx + dx * k, c.cy + dy * k, c.angle, CARD_LOCAL.text, k), whole(CARD_LOCAL.text), TEXT.w, TEXT.h)
}

// The middle of a card face, around its title: busy with text on a card, smooth on the bare floor.
const FACE_MIDDLE = { x: -100, y: -45, w: 185, h: 175 }
const EDGE_STEP = 25
// cards measure 0.10 or more and bare floor 0.04 or less, at 1440p and at 1080p alike
const CARD_DETAIL = 0.07

// Measured at the screen's own resolution: stretched to the reference size, a smaller screen's edges soften.
const hasCard = (img: Img, c: CardPos, k: number) => cardDetail(img, c, k) > CARD_DETAIL

/** The share of a card face's middle that's edges. */
function cardDetail(img: Img, c: CardPos, k: number): number {
  const p = patch(img, c.cx, c.cy, c.angle, { x: FACE_MIDDLE.x * k, y: FACE_MIDDLE.y * k, w: FACE_MIDDLE.w * k, h: FACE_MIDDLE.h * k }, 1)
  const g = gray(p)
  let edges = 0
  for (let y = 1; y < p.height; y++)
    for (let x = 1; x < p.width; x++) {
      const i = y * p.width + x
      if (Math.abs(g[i] - g[i - 1]) > EDGE_STEP || Math.abs(g[i] - g[i - p.width]) > EDGE_STEP) edges++
    }
  return edges / (p.width * p.height)
}

/** A slot as busy as this share of the busiest one holds a card too: blur (a lower render scale) softens every
 *  card's edges alike, and a real hand's weakest card keeps 0.3 of the busiest's detail at a 50% render scale
 *  (0.4 sharp), where a bare slot beside cards has under 0.2. */
const CARD_SHARE = 0.3
/** ...once the busiest is a card at all: 0.063 or more at a 50% render scale, bare floor 0.04 or less */
const CARD_BUSY = 0.05

/** How many of the three hand positions hold a card. A real hand fills all three (a Potion Kit's five
 *  cover them too); when a card is played or picked it flies off alone, leaving one or two. */
export function cardsPresent(img: Img, l: Layout): number {
  const d = l.cards.map(c => cardDetail(img, c, l.k))
  const busiest = Math.max(...d)
  return d.filter(v => v > CARD_DETAIL || (busiest > CARD_BUSY && v >= CARD_SHARE * busiest)).length
}

/** 5 when a Potion Kit's fan reaches both far ends, where a usual hand of three leaves bare floor. */
export const fanSize = (img: Img, l: Layout): 3 | 5 => (hasCard(img, l.hand5[0], l.k) && hasCard(img, l.hand5[4], l.k) ? 5 : 3)

/** The card positions for a hand of this size. */
export const handAt = (l: Layout, size: number) => (size === 5 ? l.hand5 : l.cards)

/** Offsets every card is compared at (reference px): the hand shifts sideways when one card is hovered,
 *  and the hovered card itself rises about 35. */
export const SHIFTS = [-36, -27, -18, -9, 0, 9, 18].flatMap(dy => [-48, -36, -24, -12, 0, 12, 24, 36, 48].map(dx => [dx, dy] as const))
/** Text is sharp enough that one pixel matters, so the closest few cards are also tried around their best offset. */
const FINE = [-4, -2, 0, 2, 4].flatMap(dy => [-6, -4, -2, 0, 2, 4, 6].map(dx => [dx, dy] as const))
const REFINE = 6
/** picture matches kept per card position, for the printed name to choose among */
const KEEP_RANKS = 5

export interface HandRead { phase: HandPhase | null; names: string[]; fields: Record<string, FieldRead>; problems: Problem[]; ranks?: [string, number][][] }

export function readPhase(img: Img, l: Layout, data: ScanData): { phase: HandPhase | null; score: number; second: number } {
  const sig = signature(img, l.header)
  const ranked = (Object.keys(data.headers) as HandPhase[])
    .map(p => [p, Math.max(...data.headers[p].map(h => h.reduce((s, v, i) => s + v * sig[i], 0)))] as const)
    .sort((a, b) => b[1] - a[1])
  return { phase: ranked[0][1] >= HEADER_MIN ? ranked[0][0] : null, score: ranked[0][1], second: ranked[1]?.[1] ?? 0 }
}

const dot = (a: number[], b: number[]) => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

/** Where a known card's references fit best around its position (reference px), and how well: a card
 *  raised by the mouse fits about 35 higher, one in a flash of light fits poorly. null with no references. */
export function fitOffset(img: Img, c: CardPos, k: number, key: string, data: ScanData): { at: readonly [number, number]; score: number } | null {
  const fs = data.cards[key]
  const texts = data.texts[key]
  if (!fs || !texts) return null
  let best = -Infinity
  let at: readonly [number, number] = [0, 0]
  for (const [dx, dy] of SHIFTS) {
    const art = cardArt(img, c, k, dx, dy)
    const text = cardText(img, c, k, dx, dy)
    const v = 0.5 * Math.max(...fs.map(f => similarity(f, art))) + 0.25 * (1 + Math.max(...texts.map(t => dot(t, text))))
    if (v > best) [best, at] = [v, [dx, dy]]
  }
  return { at, score: best }
}

/** Every known card ranked for one card position, best first; among: only these names. */
function rank(img: Img, c: CardPos, k: number, prefix: string, data: ScanData, local: Record<string, ArtFeature[]>, among?: string[]): (readonly [string, number])[] & { at: readonly [number, number] } {
  const arts = new Map<string, ArtFeature>()
  const txts = new Map<string, number[]>()
  const art = (dx: number, dy: number) => arts.get(`${dx},${dy}`) ?? arts.set(`${dx},${dy}`, cardArt(img, c, k, dx, dy)).get(`${dx},${dy}`)!
  const text = (dx: number, dy: number) => txts.get(`${dx},${dy}`) ?? txts.set(`${dx},${dy}`, cardText(img, c, k, dx, dy)).get(`${dx},${dy}`)!
  const scored = Object.entries({ ...data.cards, ...local })
    .filter(([key]) => key.startsWith(prefix) && (!among || among.includes(key.slice(prefix.length))))
    .map(([key, fs]) => {
      const texts = data.texts[key]
      const artAt = (dx: number, dy: number) => Math.max(...fs.map(f => similarity(f, art(dx, dy))))
      // a card a player named in this browser has art but no text yet: its art alone decides
      const both = (a: number, dx: number, dy: number) => (texts ? 0.5 * a + 0.25 * (1 + Math.max(...texts.map(t => dot(t, text(dx, dy))))) : a)
      let best = -Infinity
      let at: readonly [number, number] = [0, 0]
      let a0 = 0
      for (const [dx, dy] of SHIFTS) {
        const a = artAt(dx, dy)
        const v = both(a, dx, dy)
        if (v > best) [best, at, a0] = [v, [dx, dy], a]
      }
      return { name: key.slice(prefix.length), best, at, a0, both, texts }
    })
    .sort((a, b) => b.best - a.best)
  // the art barely changes over a pixel or two, so only the text is re-read around the best offset
  for (const s of scored.slice(0, REFINE))
    if (s.texts) for (const [fx, fy] of FINE) s.best = Math.max(s.best, s.both(s.a0, s.at[0] + fx, s.at[1] + fy))
  const out = scored.map(s => [s.name, s.best] as const).sort((a, b) => b[1] - a[1])
  // where the best match found the card: a card can sit a little off its slot
  return Object.assign(out, { at: scored.reduce((a, b) => (b.best > a.best ? b : a), scored[0])?.at ?? [0, 0] })
}

/** Look-alike cards share their picture and differ only by the creature in their name, shown by its icon in their
 *  text: purple Pest, yellow Bone Sentry, blue Aemberon (Agito's red can't be told from the hearts and "mutate"). */
const ICON_AREA = { x: -140, y: -40, w: 175, h: 190 }
const CREATURE = / - (Pest|Bone Sentry|Agito|Aemberon)$/
/** On 463 labelled look-alikes: Aemberon 88-288 blue pixels, Agito 0-75; Pest 14+ purple, Bone Sentry none
 *  and 94+ yellow. Between the bars the icon decides nothing. */
const BLUE_AEMBERON = 100
const BLUE_AGITO = 15
const PURPLE_PEST = 10
const YELLOW_SENTRY = 60
/** How far a look-alike its icon rules out drops below the one it shows: enough for the picture to be sure. */
const ICON_DROP = 0.05

/** The creature a look-alike card's icon shows, or null when it's unclear. */
export function iconCreature(img: Img, c: CardPos, k: number, pair: 'Pest' | 'Agito', [dx, dy]: readonly [number, number] = [0, 0]): string | null {
  const p = patch(img, c.cx + dx * k, c.cy + dy * k, c.angle, ICON_AREA, k)
  let purple = 0, yellow = 0, blue = 0
  for (let i = 0; i < p.data.length; i += 4) {
    const [h, s, v] = hsv(p.data[i], p.data[i + 1], p.data[i + 2])
    if (h >= 210 && h < 230 && s >= 0.25 && v >= 0.2) blue++
    if (s < 0.45 || v < 0.35) continue
    if (h >= 255 && h < 300) purple++
    else if (h >= 38 && h < 62) yellow++
  }
  if (pair === 'Agito') return blue >= BLUE_AEMBERON ? 'Aemberon' : blue <= BLUE_AGITO ? 'Agito' : null
  return purple >= PURPLE_PEST ? 'Pest' : purple === 0 && yellow >= YELLOW_SENTRY ? 'Bone Sentry' : null
}

/** A ranking with a look-alike its icon rules out moved below the one it shows. */
function byIcon(img: Img, c: CardPos, k: number, ranked: (readonly [string, number])[] & { at: readonly [number, number] }): (readonly [string, number])[] {
  const top = ranked[0]?.[0]
  const m = top && CREATURE.exec(top)
  if (!m) return ranked
  const base = top.slice(0, m.index)
  const twins = ranked.filter(([n]) => n.startsWith(base) && CREATURE.test(n) && n.slice(0, CREATURE.exec(n)!.index) === base)
  if (twins.length < 2) return ranked
  const shown = iconCreature(img, c, k, /Pest|Bone Sentry/.test(m[1]) ? 'Pest' : 'Agito', ranked.at)
  const pick = shown && twins.find(([n]) => n.endsWith(` - ${shown}`))
  if (!pick) return ranked
  const best = twins[0][1]
  return ranked.map(([n, v]) => (n === pick[0] ? [n, best] as const : twins.some(([t]) => t === n) ? [n, Math.min(v, best - ICON_DROP)] as const : [n, v] as const)).sort((a, b) => b[1] - a[1])
}

function readAt(img: Img, l: Layout, size: number, phase: HandPhase, data: ScanData, local: Record<string, ArtFeature[]>, slots?: number[], among: Record<number, string[]> = {}) {
  const fields: Record<string, FieldRead> = {}
  const problems: Problem[] = []
  const names: string[] = []
  const ranks: [string, number][][] = []
  let total = 0
  handAt(l, size).forEach((c, j) => {
    if (slots && !slots.includes(j)) return ranks.push([])
    const ranked = byIcon(img, c, l.k, rank(img, c, l.k, `${phase}:`, data, local, among[j]))
    ranks.push(ranked.slice(0, KEEP_RANKS).map(([n, v]) => [n, v]))
    total += ranked[0]?.[1] ?? 0
    if (!ranked.length || ranked[0][1] < ART_UNKNOWN) {
      problems.push({ kind: 'unknownArt', field: `hand${j}`, crop: cardFace(c, l.k), ...(size === 5 ? { hand: 5 as const } : {}) })
      fields[`hand${j}`] = { sure: false, guess: ranked[0]?.[0], score: ranked[0]?.[1], second: ranked[1]?.[1] }
      return
    }
    names.push(ranked[0][0])
    fields[`hand${j}`] = { sure: ranked[0][1] >= ART_MIN && ranked[0][1] - (ranked[1]?.[1] ?? 0) >= ART_GAP, guess: ranked[0][0], score: ranked[0][1], second: ranked[1]?.[1] }
  })
  return { names, fields, problems, ranks, mean: total / size }
}

/** Which kind of pick the header shows, without reading the cards: their printed names will. */
export function headerOnly(img: Img, l: Layout, data: ScanData): HandRead {
  const { phase, score, second } = readPhase(img, l, data)
  return { phase, names: [], fields: { phase: { sure: !!phase && score - second >= 0.05, guess: phase ?? undefined, score, second } }, problems: [] }
}

/** Some of a hand's cards by their pictures: those the printed names couldn't settle. among: per position, the
 *  few names its printed name was torn between, when it was; the picture then only chooses between them. */
export function readSlots(img: Img, l: Layout, size: number, phase: HandPhase, slots: number[], data: ScanData, local: Record<string, ArtFeature[]> = {}, among: Record<number, string[]> = {}) {
  const { fields, problems, ranks } = readAt(img, l, size, phase, data, local, slots, among)
  return { fields, problems, ranks }
}

export function readHand(img: Img, l: Layout, data: ScanData, local: Record<string, ArtFeature[]> = {}): HandRead {
  const head = headerOnly(img, l, data)
  const { phase } = head
  const phaseField = head.fields.phase
  if (!phase) return { ...head, ranks: [] }
  const read = readAt(img, l, phase === 'potion' ? fanSize(img, l) : 3, phase, data, local)
  return { phase, names: read.names, fields: { phase: phaseField, ...read.fields }, problems: read.problems, ranks: read.ranks }
}
