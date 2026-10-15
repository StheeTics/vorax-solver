import { ARCHETYPE_NAMES, RARITY_NAMES, total } from '@/data/archetypes'
import type { Tanks } from '@/engine/types'
import { Tank } from '../svg/Tank'
import { Silhouette } from '../svg/Silhouette'
import { ARCHETYPE_COLORS, ArchetypeIcon, HeartIcon } from '../svg/icons'
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
                {mon && <Silhouette archetype={mon.archetype} rarity={mon.rarity} size={96} />}
              </Tank>
            </div>
            <div className={styles.label}>
              {mon ? (
                <>
                  <div className={styles.name} data-rarity={mon.rarity}>
                    <span data-rarity-word={mon.rarity}>{RARITY_NAMES[mon.rarity]}</span>{' '}
                    <span data-archetype-word={mon.archetype} style={{ color: ARCHETYPE_COLORS[mon.archetype] }}>
                      {ARCHETYPE_NAMES[mon.archetype]}
                    </span>
                  </div>
                  <div className={styles.stats}>
                    <ArchetypeIcon archetype={mon.archetype} size={15} />
                    <span className={styles.total}><HeartIcon size={13} /> {formatNumber(total(mon))}</span>
                  </div>
                  <div className={styles.formula}>{formatNumber(mon.activity)} × {formatNumber(mon.quantity)}</div>
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
