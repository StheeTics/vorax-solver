import { advise, planningHelps, type Advice, type ScreenState } from '@/strategy/advisor'

/** The quick answer at once, then the planning answer when it helps this build. */
export function runAdvice(state: ScreenState, emit: (a: Advice) => void, adviseFn: typeof advise = advise): void {
  emit(adviseFn(state))
  if (state.phase === 'potion' && planningHelps(state.instruments)) emit(adviseFn(state, 16, 16, true))
}
