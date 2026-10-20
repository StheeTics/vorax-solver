// What the Solver remembers through a game. Instrument icons are small and some look alike (two grey
// brains), but instruments only change when one is picked, and a new one must be one of the three just
// offered, whose cards are read reliably from their text.
import type { FieldRead, Reading } from './types'

export interface InstrumentTracker {
  /** instruments known so far this game, in pick order */
  owned: string[]
  /** the last instrument offer's cards, until one of them is picked */
  offer: string[] | null
  /** picks it wasn't sure of, until a later board shows them clearly or the player says; `looks`: boards seen
   *  since the pick */
  unsure: (PickQuestion & { looks: number })[]
  /** icons in the panel before the first pick: a starting item (it shapes the starting tanks, and isn't an
   *  instrument) sits in the oldest slot, so the picks are the rest; at most 3 */
  start: number
}

/** Looks after the pick's first picture before the player is asked: that picture can catch the new icon
 *  sliding into the panel (the game's log says nothing of it), so the Solver takes another a moment later
 *  (SolverApp RELOOK_MS) and asks only if that one isn't clear either. */
const ASK_AFTER = 1

export const newTracker = (): InstrumentTracker => ({ owned: [], offer: null, unsure: [], start: 0 })

/** The player says which instrument a pick was: it's known from then on. */
export function confirmPick(t: InstrumentTracker, slot: number, name: string): InstrumentTracker {
  const owned = [...t.owned]
  owned[slot] = name
  return { ...t, owned, unsure: (t.unsure ?? []).filter(q => q.slot !== slot) }
}

const SURE = 0.9
const GAP = 0.01

/** A pick the Solver can't place: the offer it came from, and which instrument (in pick order) it is. */
export interface PickQuestion { offer: string[]; slot: number }

export function trackInstruments(
  t: InstrumentTracker,
  r: Reading,
  trigger?: string,
): { tracker: InstrumentTracker; instruments: string[]; fields: Record<string, FieldRead>; ask?: PickQuestion; settled: number[] } {
  const s = r.state
  const start = trigger === 'screen' || (s.phase === 'instrument' && s.round === 1 && s.instruments.length === 0)
  let owned = start ? [] : [...t.owned]
  // a pick comes from the offer before this picture; this picture's offer is for the next pick
  let offer = start ? null : t.offer
  let unsure = start ? [] : (t.unsure ?? [])
  // an owned instrument is sure unless it's a pick the player hasn't confirmed
  const known = (n: string, i: number): FieldRead => (unsure.some(q => q.slot === i) ? { sure: false, guess: n } : { sure: true, guess: n })
  const nextOffer = s.phase === 'instrument' && s.hand.length ? [...s.hand] : null
  if (!offer && start) offer = nextOffer

  // Before the first pick nothing is owned, so whatever the panel shows while the first offer is up (round 1)
  // isn't a pick: a starting item, which stays in the oldest slot, or on 16:9 a flask, which the first pick
  // replaces. Later offers can show a new pick beside them.
  const beforeFirstPick = s.phase === 'instrument' && s.round === 1 && owned.length === 0
  let startItems = start ? 0 : (t.start ?? 0)
  if (beforeFirstPick) startItems = s.instruments.length
  // the first pick didn't add an icon: what was there was the flask, now the pick
  else if (owned.length === 0 && startItems > 0 && offer && s.instruments.length === startItems) startItems = 0
  let panel = s.instruments.slice(startItems)
  let ranks = (r.instrumentRanks ?? []).slice(startItems)
  // three picks at most: a fourth icon (a game joined late) is a starting item
  if (panel.length > 3) {
    const extra = panel.length - 3
    startItems += extra
    panel = panel.slice(extra)
    ranks = ranks.slice(extra)
  }
  const count = beforeFirstPick ? 0 : panel.length
  const fields: Record<string, FieldRead> = {}
  let ask: PickQuestion | undefined
  // an unsure pick looked at again: the first picture can catch the icon sliding in; on a later board, a clear
  // match with one of the offer it came from settles it
  const settled: number[] = []
  if (count >= owned.length) {
    for (const q of unsure) {
      const scored = q.offer.map(n => [n, ranks[q.slot]?.find(([name]) => name === n)?.[1] ?? 0] as const).sort((a, b) => b[1] - a[1])
      if (scored[0][1] >= SURE && scored[0][1] - (scored[1]?.[1] ?? 0) >= GAP) {
        owned = owned.map((n, i) => (i === q.slot ? scored[0][0] : n))
        settled.push(q.slot)
      }
    }
    unsure = unsure.filter(q => !settled.includes(q.slot)).map(q => ({ ...q, looks: q.looks + 1 }))
    // still unclear after a few boards: the player is asked
    const due = unsure.find(q => q.looks === ASK_AFTER)
    if (due) ask = { offer: [...due.offer], slot: due.slot }
  }
  if (count === owned.length) {
    owned.forEach((n, i) => (fields[`instrument${i}`] = known(n, i)))
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
    owned.forEach((n, i) => (fields[`instrument${i}`] = known(n, i)))
    const sure = score >= SURE && score - (pick[1]?.[1] ?? 0) >= GAP
    fields[`instrument${count - 1}`] = { sure, guess: name, score, second: pick[1]?.[1] }
    // not confident which one it was (no picture of it yet, or the pictures don't match well): the player says,
    // and the answer trains the reader
    // not judged on this picture: later boards look again, and only then is the player asked
    if (!sure) unsure = [...unsure, { offer: [...offer], slot: count - 1, looks: 0 }]
    offer = null
  } else {
    // out of step (joined mid-game, or a missed picture): take the panel as read
    owned = [...panel]
    unsure = unsure.filter(q => q.slot < owned.length)
    owned.forEach((n, i) => (fields[`instrument${i}`] = r.fields[`instrument${i + startItems}`] ?? { sure: false, guess: n }))
  }
  return { tracker: { owned, offer: nextOffer ?? offer, unsure, start: startItems }, instruments: owned, fields, settled, ...(ask ? { ask } : {}) }
}
