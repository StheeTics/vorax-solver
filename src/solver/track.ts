// What the Solver remembers through a game. Instrument icons are small and some look alike (two grey
// brains), but instruments only change when one is picked, and a new one must be one of the three just
// offered, whose cards are read reliably from their text.
import type { FieldRead, Reading } from './types'

export interface InstrumentTracker {
  /** instruments known so far this game, in pick order */
  owned: string[]
  /** the last instrument offer's cards, until one of them is picked */
  offer: string[] | null
}

export const newTracker = (): InstrumentTracker => ({ owned: [], offer: null })

const SURE = 0.9
const GAP = 0.01

/** A pick the Solver can't place: the offer it came from, and which instrument (in pick order) it is. */
export interface PickQuestion { offer: string[]; slot: number }

export function trackInstruments(
  t: InstrumentTracker,
  r: Reading,
  trigger?: string,
): { tracker: InstrumentTracker; instruments: string[]; fields: Record<string, FieldRead>; ask?: PickQuestion } {
  const s = r.state
  const start = trigger === 'screen' || (s.phase === 'instrument' && s.round === 1 && s.instruments.length === 0)
  let owned = start ? [] : [...t.owned]
  // a pick comes from the offer before this picture; this picture's offer is for the next pick
  let offer = start ? null : t.offer
  const nextOffer = s.phase === 'instrument' && s.hand.length ? [...s.hand] : null
  if (!offer && start) offer = nextOffer

  // Before the first pick nothing is owned, but on 16:9 the panel shows a flask: while the first offer is up
  // (round 1, nothing owned) the panel is taken as empty. Later offers can show a new pick beside them.
  const beforeFirstPick = s.phase === 'instrument' && s.round === 1 && owned.length === 0
  const count = beforeFirstPick ? 0 : s.instruments.length
  const ranks = r.instrumentRanks ?? []
  const fields: Record<string, FieldRead> = {}
  let ask: PickQuestion | undefined
  if (count === owned.length) {
    owned.forEach((n, i) => (fields[`instrument${i}`] = { sure: true, guess: n }))
  } else if (count === owned.length + 1 && offer) {
    const pick = offer
      .map(n => [n, ranks[count - 1]?.find(([name]) => name === n)?.[1] ?? 0] as const)
      .sort((a, b) => b[1] - a[1])
    let [name, score] = pick[0]
    // like none of those we have pictures of: one we have no picture of yet (shown as unsure, to check;
    // with two or more of those it's a guess between them, and a correction sticks)
    const unpictured = offer.filter(n => !ranks[count - 1]?.some(([k]) => k === n))
    if (score < SURE && unpictured.length) [name, score] = [unpictured[0], 0]
    owned = [...owned, name]
    owned.forEach((n, i) => (fields[`instrument${i}`] = { sure: true, guess: n }))
    const sure = score >= SURE && score - (pick[1]?.[1] ?? 0) >= GAP
    fields[`instrument${count - 1}`] = { sure, guess: name, score, second: pick[1]?.[1] }
    // not confident which one it was (no picture of it yet, or the pictures don't match well): the player says,
    // and the answer trains the reader
    if (!sure) ask = { offer: [...offer], slot: count - 1 }
    offer = null
  } else {
    // out of step (joined mid-game, or a missed picture): take the panel as read
    owned = [...s.instruments]
    owned.forEach((n, i) => (fields[`instrument${i}`] = r.fields[`instrument${i}`] ?? { sure: false, guess: n }))
  }
  return { tracker: { owned, offer: nextOffer ?? offer }, instruments: owned, fields, ...(ask ? { ask } : {}) }
}
