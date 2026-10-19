// A pick the Solver wasn't sure of: the advice is worked out for each instrument it could be, and when the
// best move differs, the Solver says so instead of advising on a guess.
import type { Advice, ScreenState } from '@/strategy/advisor'
import { describe, predicted } from './describe'

export interface Alternative { name: string; board: ScreenState; advice: Advice }
export interface Depends { name: string; move: string; end: string }

const moveOf = (a: Alternative) => (a.advice.best === 'refresh' ? 'Refresh' : a.advice.best ? describe(a.advice.best, a.board, true) : '')
const endOf = (a: Alternative) => {
  const end = a.advice.best === 'refresh' ? a.advice.refreshEnd : a.advice.best?.end
  return end ? `Ends around ${predicted(end)}` : ''
}

/** Each instrument's best move, when they aren't all the same; null when it makes no difference (or the
 *  advice for every option isn't in yet). */
export function dependsOn(alts: Alternative[] | null): Depends[] | null {
  if (!alts || alts.length < 2) return null
  const moves = alts.map(moveOf)
  if (moves.every(m => m === moves[0])) return null
  return alts.map((a, i) => ({ name: a.name, move: moves[i], end: endOf(a) }))
}
