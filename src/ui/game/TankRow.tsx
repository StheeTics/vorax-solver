import { monsterName, total } from '@/data/archetypes'
import type { Tanks } from '@/engine/types'
import { Tank } from '../svg/Tank'
import { Silhouette } from '../svg/Silhouette'
import { ArchetypeIcon, HeartIcon } from '../svg/icons'
import { formatNumber } from '../format'
import { FloatingDelta, type Delta } from './FloatingDelta'
import styles from './TankRow.module.css'

interface Props {
  tanks: Tanks
  selectable: boolean
  targets: number[]
  deltas: Delta[]
  onTankClick(i: number): void
  onHover(i: number | null): void
}

export function TankRow({ tanks, selectable, targets, deltas, onTankClick, onHover }: Props) {
  return (
    <div className={styles.row}>
      {tanks.map((mon, i) => {
        const highlighted = targets.includes(i) ? 'selected' : selectable && mon ? 'selectable' : undefined
        return (
          <div
            key={i}
            className={styles.slot}
            data-testid={`tank-${i}`}
            onClick={() => highlighted && onTankClick(i)}
            onMouseEnter={() => onHover(mon ? i : null)}
            onMouseLeave={() => onHover(null)}
          >
            <div className={styles.tankScale}>
              <Tank empty={!mon} glow={mon?.rarity} highlighted={highlighted}>
                {mon && <Silhouette archetype={mon.archetype} rarity={mon.rarity} size={125} />}
              </Tank>
            </div>
            <div className={styles.label} data-part="label">
              {mon ? (
                <>
                  <div className={styles.archetype}><ArchetypeIcon archetype={mon.archetype} size={31} /></div>
                  <div className={styles.name} data-rarity={mon.rarity}>{monsterName(mon)}</div>
                  <div className={styles.stats}>
                    <span className={styles.total}><HeartIcon size={13} /> {formatNumber(total(mon))}</span>
                  </div>
                  <div className={styles.formula} data-part="formula">
                    <HeartIcon size={11} /> {formatNumber(mon.activity)} × {formatNumber(mon.quantity)}
                  </div>
                </>
              ) : (
                <div className={styles.emptyLabel}>Empty</div>
              )}
              {deltas.filter(d => d.tank === i).map(d => <FloatingDelta key={d.id} delta={d} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
