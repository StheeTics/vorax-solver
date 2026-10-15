import type { Card as CardRef } from '@/engine/types'
import { potion } from '@/data/potions'
import { instrument } from '@/data/instruments'
import { CardText } from '../CardText'
import { ArchetypeWords } from '../ArchetypeWords'
import { ItemArt } from '../svg/ItemArt'
import styles from './Card.module.css'

const POTION_FOOTER = { normal: 'Normal Potion', magic: 'Magic Potion', rare: 'Rare Potion', supreme: 'Supreme Potion' } as const

export function cardInfo(card: CardRef) {
  if (card.kind === 'potion') {
    const p = potion(card.id)
    return { name: p.name, text: p.text, item: p.item, tone: p.rarity, footer: POTION_FOOTER[p.rarity] }
  }
  const d = instrument(card.id)!
  return { name: d.name, text: d.text, item: 'instrument' as const, tone: 'instrument' as const, footer: 'Surgical Instrument' }
}

interface Props {
  card: CardRef
  selected?: boolean
  onClick?(): void
  testId?: string
  compact?: boolean
}

export function Card({ card, selected, onClick, testId, compact }: Props) {
  const info = cardInfo(card)
  return (
    // A div, not a <button>: card text contains keyword buttons, which can't nest inside a button.
    <div
      role="button"
      tabIndex={onClick ? 0 : -1}
      aria-pressed={onClick ? !!selected : undefined}
      className={`${styles.card} ${compact ? styles.compact : ''}`}
      data-tone={info.tone}
      data-selected={selected ? 'true' : 'false'}
      data-testid={testId}
      onClick={onClick}
      onKeyDown={e => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className={styles.art}><ItemArt item={info.item} size={compact ? 56 : 72} /></div>
      <div className={styles.name}><ArchetypeWords text={info.name} /></div>
      <CardText className={styles.text} text={info.text} />
      <div className={styles.footer}>{info.footer}</div>
    </div>
  )
}
