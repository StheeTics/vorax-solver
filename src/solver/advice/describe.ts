import type { Ranked, ScreenState } from '@/strategy/advisor'

/** A choice in words, as the panel and the overlay show it. place: add the card's place in the hand ("(card 2)"), for the headline. */
export function describe(r: Ranked, state: ScreenState, place = false): string {
  const name = `${state.hand[r.index] ?? `Card ${r.index + 1}`}${place ? ` (card ${r.index + 1})` : ''}`
  if (state.phase === 'instrument') return `Take ${name}`
  const move = r.targets.length ? `Play ${name} → tank ${r.targets.map(t => t + 1).join(', ')}` : `Play ${name}`
  return r.noEffect ? `${move}: does nothing, the tanks are full` : move
}

/** A look-ahead prediction in words: "900,000 · 40% rainbow". */
export const predicted = (end: NonNullable<Ranked['end']>) => `${Math.round(end.activity).toLocaleString()} · ${Math.round(100 * end.reached)}% rainbow`
