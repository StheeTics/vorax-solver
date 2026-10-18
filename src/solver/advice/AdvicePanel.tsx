import type { Advice, Ranked, ScreenState } from '@/strategy/advisor'
import styles from './AdvicePanel.module.css'
import { PickHand } from './PickHand'

interface Props {
  advice: Advice | null
  refining: boolean
  state: ScreenState
  /** instruments whose panel icon the reader knows (built in or learned in this browser) */
  iconsKnown?: string[]
}

/** place: add the card's place in the hand ("(card 2)"), for the headline */
function describe(r: Ranked, state: ScreenState, place = false): string {
  const name = `${state.hand[r.index] ?? `Card ${r.index + 1}`}${place ? ` (card ${r.index + 1})` : ''}`
  if (state.phase === 'instrument') return `Take ${name}`
  return r.targets.length ? `Play ${name} → tank ${r.targets.map(t => t + 1).join(', ')}` : `Play ${name}`
}

/** Choices listed under the headline: the best three. */
const SHOWN = 3

export function AdvicePanel({ advice, refining, state, iconsKnown }: Props) {
  // until every panel icon is known, an offered instrument whose icon hasn't been seen says picking it teaches the Solver
  const unseen = (r: Ranked) => state.phase === 'instrument' && !!iconsKnown && !!state.hand[r.index] && !iconsKnown.includes(state.hand[r.index])
  if (state.phase === 'protocol')
    return <section className={`panel-frame ${styles.panel}`} aria-label="Advice"><p className={styles.wait}>Surgical Protocols don't change Ultimate Activity: pick the one that suits your endgame battle.</p></section>
  if (!advice || state.hand.length === 0)
    return <section className={`panel-frame ${styles.panel}`} aria-label="Advice"><p className={styles.wait}>Set the cards on offer to get advice.</p></section>
  return (
    <section className={`panel-frame ${styles.panel}`} aria-label="Advice">
      {advice.best && <h2 className={styles.best}>{advice.best === 'refresh' ? 'Refresh' : describe(advice.best, state, true)}</h2>}
      {advice.best && advice.best !== 'refresh' && <PickHand pick={advice.best} state={state} />}
      {refining && <p className={styles.refining}>Quick answer, refining…</p>}
      {advice.unknown.length > 0 && <p className={styles.unknown}>Not recognised: {advice.unknown.join(', ')}</p>}
      {advice.ranking.length > 0 && (
        <ol className={styles.ranking} aria-label="Choices">
          {advice.ranking.slice(0, SHOWN).map((r, i) => (
            <li key={i}>
              <span>
                {describe(r, state)}
                {unseen(r) && <span className={styles.teach}>Unknown icon: picking it teaches the Solver</span>}
              </span>
              <span className={styles.value}>{r.value.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
      <p className={styles.legend}>{advice.plan ? 'Values are the expected final Ultimate Activity.' : 'Values are the expected Ultimate Activity after this round.'}</p>
    </section>
  )
}
