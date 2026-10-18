import { advise, type Advice, type ScreenState } from '@/strategy/advisor'

/** The quick answer at once, then for potions the look-ahead to the end of the run. */
export function runAdvice(state: ScreenState, emit: (a: Advice) => void, adviseFn: typeof advise = advise): void {
  emit(adviseFn(state))
  if (state.phase === 'potion') emit(adviseFn(state, 16, 16, true))
}
