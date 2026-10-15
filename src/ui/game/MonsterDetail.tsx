import { ARCHETYPE_NAMES, RARITY_NAMES, monsterName, total } from '@/data/archetypes'
import type { Monster } from '@/engine/types'
import { Silhouette } from '../svg/Silhouette'
import { ArchetypeIcon, HeartIcon, QuantityIcon } from '../svg/icons'
import { formatNumber } from '../format'
import styles from './MonsterDetail.module.css'

export function MonsterDetail({ monster }: { monster: Monster | null }) {
  if (!monster) {
    return <div className={`${styles.card} ${styles.idle}`}>Hover a tank to inspect its monsters</div>
  }
  return (
    <div className={styles.card} data-rarity={monster.rarity}>
      <div className={styles.portrait}>
        <Silhouette archetype={monster.archetype} rarity="rare" size={70} />
      </div>
      <div className={styles.name}>{monsterName(monster)}</div>
      <div className={styles.archetype}>
        <ArchetypeIcon archetype={monster.archetype} size={20} /> {ARCHETYPE_NAMES[monster.archetype]}
      </div>
      <div className={styles.caption}><HeartIcon size={15} /> Total Activity</div>
      <div className={styles.total}>{formatNumber(total(monster))}</div>
      <div className={styles.split}>
        <div>
          <div className={styles.caption}><HeartIcon size={14} /> Activity</div>
          <div className={styles.value}>{formatNumber(monster.activity)}</div>
        </div>
        <div className={styles.times}>×</div>
        <div>
          <div className={styles.caption}>Quantity <QuantityIcon size={14} /></div>
          <div className={styles.value}>{formatNumber(monster.quantity)}</div>
        </div>
      </div>
      <div className={styles.footer}>{RARITY_NAMES[monster.rarity]} Monster</div>
    </div>
  )
}
