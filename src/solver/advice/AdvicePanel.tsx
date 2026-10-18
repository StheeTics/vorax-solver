import type { Advice, Ranked, ScreenState } from '@/strategy/advisor'
import styles from './AdvicePanel.module.css'
import { PickHand } from './PickHand'
import { describe, predicted } from './describe'

interface Props {
  advice: Advice | null
  /** a newer board is being worked out: the advice shown is still for `state`, the board before it */
  updating: boolean
  /** the board the advice was worked out for */
  state: ScreenState
  /** instruments whose panel icon the reader knows (built in or learned in this browser) */
  iconsKnown?: string[]
}

/** Choices listed under the headline: the best three. */
const SHOWN = 3

export function AdvicePanel({ advice, updating, state, iconsKnown }: Props) {
  // until every panel icon is known, an offered instrument whose icon hasn't been seen says picking it teaches the Solver
  const unseen = (r: Ranked) => state.phase === 'instrument' && !!iconsKnown && !!state.hand[r.index] && !iconsKnown.includes(state.hand[r.index])
  if (state.phase === 'protocol')
    return <section className={`panel-frame ${styles.panel}`} aria-label="Advice"><p className={styles.wait}>Surgical Protocols don't change Ultimate Activity: pick the one that suits your endgame battle.</p></section>
  if (!advice && updating)
    return <section className={`panel-frame ${styles.panel}`} aria-label="Advice"><p className={styles.wait}>Working out the best move…</p></section>
  if (!advice || state.hand.length === 0)
    return <section className={`panel-frame ${styles.panel}`} aria-label="Advice"><p className={styles.wait}>Set the cards on offer to get advice.</p></section>
  return (
    <section className={`panel-frame ${styles.panel} ${updating ? styles.stale : ''}`} aria-label="Advice" aria-busy={updating}>
      {updating && <p className={styles.updating} role="status">Working out the new board…</p>}
      {advice.best && <h2 className={styles.best}>{advice.best === 'refresh' ? 'Refresh' : describe(advice.best, state, true)}</h2>}
      <PickHand pick={advice.best && advice.best !== 'refresh' ? advice.best : null} state={state} />
      {advice.unknown.length > 0 && <p className={styles.unknown}>Not recognised: {advice.unknown.join(', ')}</p>}
      {advice.note && <p className={styles.note}>{advice.note}</p>}
      {!advice.note && advice.ranking.length > 0 && (
        <ol className={styles.ranking} aria-label="Choices">
          {advice.ranking.slice(0, SHOWN).map((r, i) => (
            <li key={i}>
              <span>
                {describe(r, state)}
                {unseen(r) && <span className={styles.teach}>Unknown icon: picking it teaches the Solver</span>}
              </span>
              <span className={styles.value}>{r.end ? predicted(r.end) : r.value.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
      {!advice.note && <p className={styles.legend}>{advice.plan ? 'Each choice was played to the end of the run 32 times: the average final Ultimate Activity, counted up to 950,000, and how often it reached 950,000 (rainbow with the endgame battle bonus).' : 'Values are the expected Ultimate Activity after this round.'}</p>}
    </section>
  )
}
