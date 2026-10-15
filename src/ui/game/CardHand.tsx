import type { GameState } from '@/engine/types'
import { canConfirm, canRefresh, needsTargets } from '@/engine/game'
import { potion } from '@/data/potions'
import { DiceIcon } from '../svg/icons'
import { Card } from './Card'
import styles from './CardHand.module.css'

interface Props {
  state: GameState
  onSelect(i: number): void
  onConfirm(): void
  onRefresh(): void
}

function header(s: GameState): string {
  if (s.phase === 'roundEnd') return `Round ${s.round}: no potions this round`
  if (s.phase === 'instrumentSelect') return 'Select a Surgical Instrument'
  const t = needsTargets(s)
  if (t === 'select1') return 'Select 1 target tank'
  if (t === 'select1to2') return 'Select 1–2 target tanks'
  return 'Select a Potion'
}

export function CardHand({ state, onSelect, onConfirm, onRefresh }: Props) {
  const refreshes = state.phase === 'instrumentSelect' ? state.instrumentRefreshes : state.potionRefreshes
  return (
    <div className={styles.area}>
      <div className={styles.header}>
        <span>{header(state)}</span>
        {state.openBox !== null && <span className={styles.box}>{potion(state.openBox).name}</span>}
      </div>
      {state.phase === 'roundEnd' && (
        <p className={styles.roundNote}>Your Surgical Instruments resolve when you end the round.</p>
      )}
      <div className={styles.cards}>
        {state.hand.map((card, i) => (
          <Card key={`${card.kind}-${card.id}-${i}`} card={card} testId={`card-${i}`} selected={state.selected === i} onClick={() => onSelect(i)} />
        ))}
      </div>
      <div className={styles.actions}>
        <button className={`gold-button ${styles.confirm}`} disabled={!canConfirm(state)} onClick={onConfirm}>
          {state.phase === 'roundEnd' ? 'End Round' : 'Confirm'}
        </button>
        {state.phase !== 'roundEnd' && <button className={styles.refresh} aria-label={`Refresh (${refreshes} left)`} disabled={!canRefresh(state)} onClick={onRefresh}>
          <DiceIcon /> <span>{refreshes}</span>
        </button>}
      </div>
    </div>
  )
}
