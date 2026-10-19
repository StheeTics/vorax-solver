import type { Advice, ScreenState } from '@/strategy/advisor'
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

/** The game's refresh die: bone white with red pips. */
const Die = () => (
  <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true">
    <rect x="1.5" y="1.5" width="19" height="19" rx="4" fill="#e9dfd2" stroke="#8d8378" />
    <circle cx="7" cy="7" r="2" fill="#c41d2b" />
    <circle cx="11" cy="11" r="2" fill="#c41d2b" />
    <circle cx="15" cy="15" r="2" fill="#c41d2b" />
  </svg>
)

const refreshesLeft = (s: ScreenState) => (s.phase === 'instrument' ? s.instrumentRefreshes : s.potionRefreshes) ?? 0

export function AdvicePanel({ advice, updating, state, iconsKnown }: Props) {
  // until every panel icon is known, an offered instrument whose icon hasn't been seen says picking it teaches the Solver
  const unseen = state.phase === 'instrument' && iconsKnown ? state.hand.filter(n => n && !iconsKnown.includes(n)) : []
  if (state.phase === 'protocol')
    return <section className={`panel-frame ${styles.panel}`} aria-label="Advice"><p className={styles.wait}>Surgical Protocols don't change Ultimate Activity: pick the one that suits your endgame battle.</p></section>
  if (!advice && updating)
    return <section className={`panel-frame ${styles.panel}`} aria-label="Advice"><p className={styles.wait}>Working out the best move…</p></section>
  if (!advice || state.hand.length === 0)
    return <section className={`panel-frame ${styles.panel}`} aria-label="Advice"><p className={styles.wait}>Set the cards on offer to get advice.</p></section>
  return (
    <section className={`panel-frame ${styles.panel} ${updating ? styles.stale : ''}`} aria-label="Advice" aria-busy={updating}>
      <div className={styles.head} role="group" aria-label="This board">
        <span>Round {state.round ?? 1} · choose {state.phase === 'instrument' ? 'an instrument' : 'a potion'}</span>
        <span className={styles.left} data-none={refreshesLeft(state) === 0}>
          <Die />
          <b>{refreshesLeft(state)}</b> refresh{refreshesLeft(state) === 1 ? '' : 'es'} left
        </span>
      </div>
      {updating && <p className={styles.updating} role="status">Working out the new board…</p>}
      <PickHand pick={advice.best && advice.best !== 'refresh' ? advice.best : null} state={state}>
        {advice.best && (
          <div className={styles.move}>
            <h2 className={styles.best}>{advice.best === 'refresh' ? 'Refresh' : describe(advice.best, state, true)}</h2>
            {advice.best === 'refresh' && advice.refreshEnd && <p className={styles.refreshEnd}>Ends around {predicted(advice.refreshEnd)}</p>}
          </div>
        )}
      </PickHand>
      {unseen.length > 0 && <p className={styles.teach}>{unseen.join(' and ')}: icon{unseen.length === 1 ? '' : 's'} not seen yet. Picking {unseen.length === 1 ? 'it' : 'one'} teaches the Solver.</p>}
      {advice.unknown.length > 0 && <p className={styles.unknown}>Not recognised: {advice.unknown.join(', ')}</p>}
      {advice.note && <p className={styles.note}>{advice.note}</p>}
    </section>
  )
}
