// What pauses the Solver: advice worked out from a board it can't trust is worse than none. The player can
// still ask for it anyway, told plainly it won't be reliable.
import { TROUBLES, type Trouble } from '../live/troubles'

export type Pause = 'logOff' | 'cantRead' | 'windowed' | 'shelley'

/** `action` is what the card over the game says in big, in place of the move. */
export const PAUSES: Record<Pause, { action: string; why: string; fix: string[] }> = {
  logOff: { action: 'Enable your Log', why: TROUBLES.logOff.card, fix: TROUBLES.logOff.steps },
  cantRead: { action: 'Check your game screen', why: TROUBLES.cantRead.card, fix: TROUBLES.cantRead.steps },
  windowed: { action: 'Set the game to borderless', why: TROUBLES.windowed.card, fix: TROUBLES.windowed.steps },
  shelley: { action: 'Pick your Shelley level', why: 'Your Intern Shelley level isn’t picked, so the Solver doesn’t know how many refreshes you have.', fix: ['Pick it in the Solver.'] },
}

/** What pauses the Solver now, most pressing first: the log, the screen, then the Shelley level. Window
 *  troubles (no window, capture blocked) aren't here: with no picture there's no advice to pause. */
export function pausesOf(troubles: Trouble[], shelleyUnset: boolean): Pause[] {
  const out: Pause[] = troubles.filter(t => t === 'logOff' || t === 'cantRead' || t === 'windowed')
  if (shelleyUnset) out.push('shelley')
  return out
}

/** The pauses the player hasn't overridden: any one left pauses the Solver. */
export const stillPaused = (pauses: Pause[], forced: Pause[]): Pause[] => pauses.filter(p => !forced.includes(p))
