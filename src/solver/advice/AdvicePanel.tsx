import type { Advice, Ranked, ScreenState } from '@/strategy/advisor'
import styles from './AdvicePanel.module.css'

interface Props {
  advice: Advice | null
  refining: boolean
  state: ScreenState
  /** instruments whose panel icon the reader knows (built in or learned in this browser) */
  iconsKnown?: string[]
}

function describe(r: Ranked, state: ScreenState): string {
  const name = state.hand[r.index] ?? `Card ${r.index + 1}`
  if (state.phase === 'instrument') return `Take ${name}`
  return r.targets.length ? `Play ${name} → tank ${r.targets.map(t => t + 1).join(', ')}` : `Play ${name}`
}

const either = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0])

export function AdvicePanel({ advice, refining, state, iconsKnown }: Props) {
  // until every panel icon is known, an offer of an unseen one says that picking it teaches the Solver
  const unseen = state.phase === 'instrument' && iconsKnown ? state.hand.filter(n => !iconsKnown.includes(n)) : []
  if (state.phase === 'protocol')
    return <section className={`panel-frame ${styles.panel}`} aria-label="Advice"><p className={styles.wait}>Surgical Protocols don't change Ultimate Activity: pick the one that suits your endgame battle.</p></section>
  if (!advice || state.hand.length === 0)
    return <section className={`panel-frame ${styles.panel}`} aria-label="Advice"><p className={styles.wait}>Set the cards on offer to get advice.</p></section>
  return (
    <section className={`panel-frame ${styles.panel}`} aria-label="Advice">
      {advice.best && <h2 className={styles.best}>{advice.best === 'refresh' ? 'Refresh' : describe(advice.best, state)}</h2>}
      {refining && <p className={styles.refining}>Quick answer, refining…</p>}
      {advice.unknown.length > 0 && <p className={styles.unknown}>Not recognised: {advice.unknown.join(', ')}</p>}
      {unseen.length > 0 && (
        <p className={styles.learning}>
          Learning: picking {either(unseen)} teaches the Solver its icon. It hasn't seen {unseen.length > 1 ? 'these' : 'it'} in the instrument panel yet. Picking is up to you; the advice above doesn't change.
        </p>
      )}
      {advice.ranking.length > 0 && (
        <ol className={styles.ranking}>
          {advice.ranking.map((r, i) => (
            <li key={i}>
              <span>{describe(r, state)}</span>
              <span className={styles.value}>{r.value.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
      <p className={styles.legend}>{advice.plan ? 'Values are the expected final Ultimate Activity.' : 'Values are the expected Ultimate Activity after this round.'}</p>
    </section>
  )
}
