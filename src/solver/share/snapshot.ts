// What the Solver shares for the odds study: one board it read, with no picture, no time and nothing
// about the player. Boards of one game share a run id, in seq order.
import type { ScreenMonster } from '@/strategy/advisor'
import type { FieldKey, Reading, Source } from '../types'
import type { Shown } from '../advice/useAdvice'
import { describe } from '../advice/describe'

/** The advice shown for a board, so real games can check the predictions: the move in words, and its
 *  predicted end (average counted to 950,000, share of futures reaching it) when the look-ahead gave one. */
export interface SharedAdvice { move: string; activity: number | null; reached: number | null }

export interface Snapshot {
  uid: string
  run: string
  seq: number
  app: string
  source: 'live'
  trigger: string
  round: number
  phase: 'potion' | 'instrument' | 'protocol'
  refreshes: number
  tanks: (ScreenMonster | null)[]
  hand: string[]
  instruments: string[]
  shelley: number
  corrected: FieldKey[]
  advice?: SharedAdvice
}

export function sharedAdvice(shown: Shown | null): SharedAdvice | undefined {
  const best = shown?.advice.best
  if (!shown || !best) return undefined
  const end = best === 'refresh' ? shown.advice.refreshEnd : best.end
  return { move: best === 'refresh' ? 'Refresh' : describe(best, shown.board, true), activity: end ? Math.round(end.activity) : null, reached: end ? end.reached : null }
}

/** Only boards the reader was sure of, or the player corrected, from a real screen. */
export function shareable(r: Reading, source: Source, corrected: FieldKey[]): boolean {
  if (source === 'demo' || r.problems.some(p => p.kind === 'notFound' || p.kind === 'unknownArt')) return false
  return Object.entries(r.fields).every(([k, f]) => f.sure || corrected.includes(k))
}

/** The game's last board (the round-13 Surgical Protocol): its total is the final score, and no board follows
 *  to send it with, so it's shared at once. */
export const isFinalBoard = (r: Reading) => r.state.phase === 'protocol' && r.state.round === 13

export const startsRun = (r: Reading, trigger: string) => trigger === 'screen' || (r.state.phase === 'instrument' && r.state.round === 1)

export function toSnapshot(r: Reading, ctx: { run: string; seq: number; app: string; source: 'live'; trigger: string; shelley: number; corrected: FieldKey[]; advice?: SharedAdvice }): Snapshot {
  const s = r.state
  return {
    uid: crypto.randomUUID(),
    run: ctx.run,
    seq: ctx.seq,
    app: ctx.app,
    source: ctx.source,
    trigger: ctx.trigger,
    round: s.round ?? 1,
    phase: s.phase,
    refreshes: (s.phase === 'potion' ? s.potionRefreshes : s.phase === 'instrument' ? s.instrumentRefreshes : 0) ?? 0,
    tanks: s.tanks.map(t => (t ? { archetype: t.archetype, rarity: t.rarity, activity: t.activity, quantity: t.quantity } : null)),
    hand: [...s.hand],
    instruments: [...s.instruments],
    shelley: ctx.shelley,
    corrected: [...ctx.corrected],
    ...(ctx.advice ? { advice: ctx.advice } : {}),
  }
}
