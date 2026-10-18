// What the Solver shares for the odds study: one board it read, with no picture, no time and nothing
// about the player. Boards of one game share a run id, in seq order.
import type { ScreenMonster } from '@/strategy/advisor'
import type { FieldKey, Reading, Source } from '../types'

export interface Snapshot {
  uid: string
  run: string
  seq: number
  app: string
  source: 'live' | 'screenshot'
  trigger: string
  round: number
  phase: 'potion' | 'instrument' | 'protocol'
  refreshes: number
  tanks: (ScreenMonster | null)[]
  hand: string[]
  instruments: string[]
  shelley: number
  corrected: FieldKey[]
}

/** Only boards the reader was sure of, or the player corrected, from a real screen. */
export function shareable(r: Reading, source: Source, corrected: FieldKey[]): boolean {
  if (source === 'manual' || r.problems.some(p => p.kind === 'notFound' || p.kind === 'unknownArt')) return false
  return Object.entries(r.fields).every(([k, f]) => f.sure || corrected.includes(k))
}

export const startsRun = (r: Reading, trigger: string) => trigger === 'screen' || (r.state.phase === 'instrument' && r.state.round === 1)

export function toSnapshot(r: Reading, ctx: { run: string; seq: number; app: string; source: 'live' | 'screenshot'; trigger: string; shelley: number; corrected: FieldKey[] }): Snapshot {
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
  }
}
