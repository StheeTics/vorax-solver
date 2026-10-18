// The screenshot reader's reference data, made from labelled live frames (scripts/scan/build.ts runs it).
import { glyphVector, gray, signature, type ArtFeature, type Img } from '../../src/solver/scan/pixels'
import { layout } from '../../src/solver/scan/layout'
import { cardArt, cardText, handAt } from '../../src/solver/scan/cards'
import { iconPattern } from '../../src/solver/scan/instruments'
import { brightest, glyphs, type TextKind } from '../../src/solver/scan/text'
import type { HandPhase, ScanData } from '../../src/solver/scan/data'
import type { ScreenState } from '../../src/strategy/advisor'
import type { Rarity } from '../../src/engine/types'

export interface Label {
  kind: 'board' | 'instrumentOffer' | 'other' | 'cards'
  /** the equipped-instrument panel shows something that isn't a known instrument: don't learn icons from it */
  panelUnknown?: true
  state?: ScreenState & { phase: HandPhase }
  /** a tick frame labelled for its hand only (scripts/scan/cards.json); hover marks a raised card, blurred
   *  a frame caught in a flash of light: neither teaches the cards' pictures */
  cards?: { phase: HandPhase; hand: string[]; hover?: number; blurred?: true; instruments?: string[] }
  note?: string
}

/** Samples kept per class: enough variety without bloating the site. */
const KEEP = 8
const round3 = (v: number) => Math.round(v * 1000) / 1000
const roundFeature = (f: ArtFeature): ArtFeature => ({ hist: f.hist.map(round3), grid: f.grid.map(v => Math.round(v * 10) / 10) })

function push<T>(map: Record<string, T[]>, key: string, v: T) {
  const list = (map[key] ??= [])
  if (list.length < KEEP) list.push(v)
}

type Op = { to: 'digit'; kind: TextKind; key: string; v: number[]; size: number } | { to: 'rarity'; key: Rarity; v: [number, number, number] } | { to: 'header'; key: HandPhase; v: number[] } | { to: 'icon'; key: string; v: number[] }
interface Extracted { board: boolean; ops: Op[]; cards: { key: string; art: ArtFeature; text: number[] }[] }

// What one labelled frame contributes, worked out once per picture: scoring rebuilds the data for every
// frame it holds out, from the same pictures.
const extracted = new WeakMap<Img, Extracted>()

function extract(img: Img, label: Label): Extracted {
  const hit = extracted.get(img)
  if (hit) return hit
  const out: Extracted = { board: false, ops: [], cards: [] }
  const l = layout(img)
  const hand = label.cards ?? label.state
  hand?.hand.forEach((name, j) => {
    const pos = handAt(l, hand.hand.length)[j]
    out.cards.push({ key: `${hand.phase}:${name}`, art: roundFeature(cardArt(img, pos, l.k)), text: cardText(img, pos, l.k).map(round3) })
  })
  // a hand-only label can carry the equipped instruments too (worked out by the instrument tracker)
  const equipped = label.cards?.instruments
  if (equipped) l.instrumentIcon.forEach((r, j) => out.ops.push({ to: 'icon', key: equipped[equipped.length - 1 - j] ?? 'none', v: iconPattern(img, r).map(round3) }))
  const s = label.cards ? undefined : label.state
  if (s) {
    out.board = true
    const g = gray(img)
    const learn = (kind: TextKind, r: { x: number; y: number; w: number; h: number }, text: string) => {
      const gs = glyphs(img, r, kind)
      if (gs.length !== text.length) return
      const lineH = Math.max(...gs.map(b => b.h))
      gs.forEach((b, i) => out.ops.push({ to: 'digit', kind, key: text[i], v: Array.from(glyphVector(g, img.width, img.height, b, lineH), round3), size: img.height }))
    }
    s.tanks.forEach((t, i) => {
      if (!t) return
      learn('label', l.totalBand[i], String(t.activity * t.quantity))
      learn('label', l.aqBand[i], `${t.activity}x${t.quantity}`)
      out.ops.push({ to: 'rarity', key: t.rarity, v: brightest(img, l.nameBand[i]) })
    })
    if (s.round) learn('round', l.round, String(s.round))
    const refreshes = s.phase === 'potion' ? s.potionRefreshes : s.phase === 'instrument' ? s.instrumentRefreshes : undefined
    if (refreshes !== undefined) learn('refresh', l.refresh, String(refreshes))
    out.ops.push({ to: 'header', key: s.phase, v: signature(img, l.header).map(round3) })
    if (!label.panelUnknown) l.instrumentIcon.forEach((r, j) => out.ops.push({ to: 'icon', key: s.instruments[s.instruments.length - 1 - j] ?? 'none', v: iconPattern(img, r).map(round3) }))
  }
  extracted.set(img, out)
  return out
}

export function buildData(frames: { img: Img; label: Label }[]): ScanData {
  const digits: Record<TextKind, Record<string, number[][]>> = { label: {}, round: {}, refresh: {} }
  const rarityRgb = {} as Record<Rarity, [number, number, number][]>
  const cards: Record<string, ArtFeature[]> = {}
  const texts: Record<string, number[][]> = {}
  const headers = {} as Record<HandPhase, number[][]>
  const instrumentIcons: Record<string, number[][]> = {}
  const all = frames.filter(f => f.label.state || f.label.cards).map(f => extract(f.img, f.label))
  // digits look different at each screen height, so each height keeps its own examples
  const digitCount = new Map<string, number>()
  for (const e of all)
    for (const op of e.ops) {
      if (op.to === 'digit') {
        const key = `${op.kind}|${op.key}|${op.size}`
        const n = digitCount.get(key) ?? 0
        if (n < KEEP) (digits[op.kind][op.key] ??= []).push(op.v)
        digitCount.set(key, n + 1)
      }
      else if (op.to === 'rarity') push(rarityRgb, op.key, op.v)
      else if (op.to === 'header') push(headers, op.key, op.v)
      else push(instrumentIcons, op.key, op.v)
    }
  // boards' cards first, so the hand-only tick frames only top up cards with few examples
  for (const e of [...all.filter(e => e.board), ...all.filter(e => !e.board)])
    for (const c of e.cards) {
      push(cards, c.key, c.art)
      push(texts, c.key, c.text)
    }
  return { generated: new Date().toISOString().slice(0, 10), frames: all.filter(e => e.board).length, digits, rarityRgb, cards, texts, headers, instrumentIcons }
}
