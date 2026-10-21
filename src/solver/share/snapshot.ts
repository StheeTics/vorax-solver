// What the Solver shares for the odds study: one board it read, with no picture, no time and nothing
// about the player but a random install number (to count players). Boards of one game share a run id, in seq order.
import type { ScreenMonster } from '@/strategy/advisor'
import type { FieldKey, Reading, ReadDebug, Source } from '../types'
import type { Environment } from './setup'
import type { Shown } from '../advice/useAdvice'
import { describe } from '../advice/describe'

/** The advice shown for a board, so real games can check the predictions: the move in words, and its
 *  predicted end (average counted to 950,000, share of futures reaching it) when the look-ahead gave one. */
export interface SharedAdvice { move: string; activity: number | null; reached: number | null }

export interface Snapshot {
  uid: string
  /** this browser's or app's random install number (shareStore installId), to count players */
  install?: string
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
  /** fields the reader wasn't sure of and the player didn't correct: the odds learn only from the rest
   *  (boards shared before had none, being all sure) */
  unsure?: FieldKey[]
  advice?: SharedAdvice
  debug?: SharedDebug
  /** a picture that wasn't the game screen: shared (with its setup) so a setup that breaks every read shows up;
   *  nothing is learned from it */
  unreadable?: true
}

/** The game's window in Vorax Overlay: its outer size and the picture inside it (a title bar and borders make
 *  them differ, which moves everything the reader looks for), and Windows' display scaling. */
export interface GameWindow { outer: [number, number]; client: [number, number]; scale: number }

/** What helps find out why a setup misreads: the capture's size, the screen, the browser, the colours, each
 *  tank's lines as read, and the match scores of the unsure fields. */
export type SharedDebug = Environment & Omit<ReadDebug, 'ms'> & { frame: [number, number]; ms?: number; scores: Record<FieldKey, [number, number]>; window?: GameWindow }

export function debugOf(r: Reading, unsure: FieldKey[], env: Environment, win: GameWindow | null): SharedDebug {
  // what the collector keeps: scores within -1..1, a line of at most 16 characters
  const round = (v: number | undefined) => Math.max(-1, Math.min(1, Math.round((v ?? 0) * 1000) / 1000))
  const scores = Object.fromEntries(unsure.filter(k => r.fields[k]?.score !== undefined).map(k => [k, [round(r.fields[k].score), round(r.fields[k].second)] as [number, number]]))
  const d = r.debug
  return {
    frame: [r.frame?.width ?? 0, r.frame?.height ?? 0], ...env, ...(d?.ms !== undefined ? { ms: d.ms } : {}),
    off: d?.off ?? 0, corrected: d?.corrected ?? false, tanks: (d?.tanks ?? []).map(t => t && { ...t, total: t.total.slice(0, 16), aq: t.aq.slice(0, 16) }), scores, ...(win ? { window: win } : {}),
  }
}

export function sharedAdvice(shown: Shown | null): SharedAdvice | undefined {
  const best = shown?.advice.best
  if (!shown || !best) return undefined
  const end = best === 'refresh' ? shown.advice.refreshEnd : best.end
  return { move: best === 'refresh' ? 'Refresh' : describe(best, shown.board, true), activity: end ? Math.round(end.activity) : null, reached: end ? end.reached : null }
}

/** Every board read from the game, sure or not (each card seen counts toward the odds), and pictures that
 *  weren't the game screen (flagged unreadable); never a Manual one. */
export const shareable = (_r: Reading, source: Source): boolean => source !== 'demo'

/** The fields the reader wasn't sure of, the player didn't correct, or (cards) didn't recognise. */
export function unsureFields(r: Reading, corrected: FieldKey[]): FieldKey[] {
  const out = Object.entries(r.fields).filter(([k, f]) => !f.sure && !corrected.includes(k)).map(([k]) => k)
  for (const p of r.problems) if (p.kind === 'unknownArt' && !out.includes(p.field) && !corrected.includes(p.field)) out.push(p.field)
  return out
}

/** The game's last board (the round-13 Surgical Protocol): its total is the final score, and no board follows
 *  to send it with, so it's shared at once. */
export const isFinalBoard = (r: Reading) => r.state.phase === 'protocol' && r.state.round === 13

/** A game's very start: the first instrument offer, nothing taken yet, the round read for sure (an unread round
 *  falls back to 1, and mustn't start a game). */
export const atStart = (r: Reading) => r.state.phase === 'instrument' && r.state.round === 1 && !r.state.instruments.length && r.fields.round?.sure !== false

/** A new run: the game screen opening, or arriving at a game's start. While the first offer stays up (rerolled,
 *  read again, the screen reported again) it's the same run: each of those used to start one, so most "games"
 *  seemed to stop at round 1. */
export const startsRun = (r: Reading, trigger: string, wasAtStart = false) => (trigger === 'screen' || atStart(r)) && !(wasAtStart && atStart(r))

export function toSnapshot(r: Reading, ctx: { run: string; seq: number; app: string; source: 'live'; trigger: string; shelley: number; corrected: FieldKey[]; unsure: FieldKey[]; advice?: SharedAdvice; debug?: SharedDebug; install?: string }): Snapshot {
  const s = r.state
  return {
    uid: crypto.randomUUID(),
    ...(ctx.install ? { install: ctx.install } : {}),
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
    unsure: [...ctx.unsure],
    ...(ctx.advice ? { advice: ctx.advice } : {}),
    ...(ctx.debug ? { debug: ctx.debug } : {}),
    ...(r.problems.some(p => p.kind === 'notFound') ? { unreadable: true as const } : {}),
  }
}
