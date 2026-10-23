// When a board's picture didn't read cleanly, another look soon: so no one is left with a half-read board.
import { unreadTanks } from '../advice/unread'
import type { Reading } from '../types'

/** another look after this long, up to this many times (3 s) from the board's own picture */
export const RETRY_MS = 500
export const RETRIES = 6

/** Whether a reading needs another look: caught mid-animation, the board not found, or a tank or card not read
 *  for sure. A protocol's name doesn't change the advice (protocols are the player's call), so it isn't looked
 *  at again for one. */
export const unsureReading = (r: Reading) =>
  r.problems.some(p => p.kind === 'animating' || p.kind === 'notFound') ||
  unreadTanks(r.fields, {}).length > 0 ||
  (r.state.phase !== 'protocol' && r.state.hand.some((_, j) => !r.fields[`hand${j}`]?.sure))

/** Looks taken since the board's picture, and whether to take another. A board or screen picture starts the
 *  count; the looks themselves are manual pictures; anything else (a screenshot, capture mode) isn't retried. */
export function nextLook(trigger: string | undefined, unsure: boolean, looks: number): { looks: number; again: boolean } {
  if (trigger === 'board' || trigger === 'screen') looks = 0
  else if (trigger !== 'manual') return { looks, again: false }
  if (!unsure || looks >= RETRIES) return { looks, again: false }
  return { looks: looks + 1, again: true }
}
