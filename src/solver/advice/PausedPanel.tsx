import { PAUSES, type Pause } from './paused'
import styles from './PausedPanel.module.css'

/** In place of the advice while something makes it untrustworthy: what, how to fix it, and a way to see the
 *  advice anyway. */
export function PausedPanel({ pauses, onForce }: { pauses: Pause[]; onForce(): void }) {
  return (
    <section className={`panel-frame ${styles.panel}`} aria-label="Advice">
      <h2 className={styles.title}>Solver paused</h2>
      <p className={styles.lead}>Its advice would be wrong until {pauses.length > 1 ? 'these are' : 'this is'} fixed:</p>
      <ul className={styles.reasons}>
        {pauses.map(p => (
          <li key={p}>
            <strong>{PAUSES[p].action}.</strong> {PAUSES[p].why}
            {PAUSES[p].fix.map(f => <span key={f} className={styles.fix}>{f}</span>)}
          </li>
        ))}
      </ul>
      <div className={styles.force}>
        <button type="button" className={styles.forceButton} onClick={onForce}>Show advice anyway</button>
        <span>Not reliable: the moves may be wrong.</span>
      </div>
    </section>
  )
}

/** Over the advice once the player asked for it anyway. */
export function UnreliableNote({ pauses, onPause }: { pauses: Pause[]; onPause(): void }) {
  return (
    <p className={styles.unreliable} role="alert">
      <strong>Unreliable advice.</strong> {pauses.map(p => PAUSES[p].why).join(' ')}{' '}
      <button type="button" className={styles.pauseAgain} onClick={onPause}>Pause it again</button>
    </p>
  )
}
