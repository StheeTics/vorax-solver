import { advise, type Advice, type ScreenState } from '@/strategy/advisor'

/** One answer per board: for potions the look-ahead to the end of the run (no quick answer first). */
export function runAdvice(state: ScreenState, emit: (a: Advice) => void, adviseFn: typeof advise = advise): void {
  emit(state.phase === 'potion' ? adviseFn(state, 16, 16, true) : adviseFn(state))
}
