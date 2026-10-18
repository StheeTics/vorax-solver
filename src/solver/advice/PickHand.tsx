// The pick drawn as the game shows it: the cards on offer left to right with the one to take marked, and for a
// potion with targets, the six tanks with the targets marked. Faster to match to the screen than names.
import { POTIONS } from '@/data/potions'
import { INSTRUMENTS } from '@/data/instruments'
import type { Card } from '@/engine/types'
import type { Ranked, ScreenState } from '@/strategy/advisor'
import { CardArt } from '@/ui/svg/CardArt'
import styles from './PickHand.module.css'

const potion = new Map(POTIONS.map(p => [p.name, p]))
const instrument = new Map(INSTRUMENTS.map(i => [i.name, i]))

/** The drawing and frame colour for an offered card's name, as the game frames them. */
function look(name: string, phase: ScreenState['phase']): { card?: Card; frame: string } {
  if (phase === 'instrument') {
    const i = instrument.get(name)
    return { card: i && { kind: 'instrument', id: i.id }, frame: 'rare' }
  }
  const p = potion.get(name)
  return { card: p && { kind: 'potion', id: p.id }, frame: p?.rarity ?? 'normal' }
}

export function PickHand({ pick, state }: { pick: Ranked; state: ScreenState }) {
  return (
    <div className={styles.pick}>
      <ol className={styles.hand} aria-label="Cards on offer">
        {state.hand.map((name, i) => {
          const { card, frame } = look(name, state.phase)
          const chosen = i === pick.index
          return (
            <li
              key={i}
              className={`${styles.card} ${styles[frame]} ${chosen ? styles.chosen : ''}`}
              aria-label={`Card ${i + 1}: ${name}${chosen ? ', pick this' : ''}`}
              aria-current={chosen ? 'true' : undefined}
            >
              {chosen && <span className={styles.badge}>Pick</span>}
              {card && <CardArt card={card} size={40} />}
              <span className={styles.name}>{name}</span>
            </li>
          )
        })}
      </ol>
      {pick.targets.length > 0 && (
        <ol className={styles.tanks} aria-label="Tanks">
          {state.tanks.map((t, i) => {
            const target = pick.targets.includes(i)
            return (
              <li key={i} className={`${styles.tank} ${t ? '' : styles.empty} ${target ? styles.target : ''}`} aria-current={target ? 'true' : undefined}>
                {i + 1}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
