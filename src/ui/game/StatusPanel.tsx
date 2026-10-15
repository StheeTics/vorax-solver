import type { GameState } from '@/engine/types'
import { LAST_ROUND, ultimateActivity } from '@/engine/game'
import { nextVial, vialTiers } from '@/engine/rewards'
import { formatNumber } from '../format'
import { HeartIcon } from '../svg/icons'
import { Vial } from '../svg/Vial'
import styles from './StatusPanel.module.css'

export function VialRow({ ua, size = 32 }: { ua: number; size?: number }) {
  return (
    <div className={styles.vials} data-testid="vials">
      {vialTiers(ua).map((tier, i) => <Vial key={i} tier={tier} size={size} />)}
    </div>
  )
}

export function StatusPanel({ state }: { state: GameState }) {
  const ua = ultimateActivity(state)
  const next = nextVial(ua)
  return (
    <div className={`panel-frame ${styles.panel}`}>
      <div className={styles.caption}>Round</div>
      <div className={styles.round} data-testid="round">
        <span className={styles.roundNow}>{state.round}</span>/{LAST_ROUND}
      </div>
      <div className={styles.caption}><HeartIcon size={15} /> Ultimate Activity</div>
      <div className={styles.ua} data-testid="ultimate-activity">{formatNumber(ua)}</div>
      <div className={styles.rule} />
      <div className={styles.caption}>Next Rewards</div>
      <div data-testid="next-reward">
        <div className={styles.next}>{next === null ? '—' : formatNumber(next.value)}</div>
        {next && (
          <div className={styles.nextReward}>
            <Vial tier={next.tier} size={30} />
            <span>Level Up</span>
          </div>
        )}
      </div>
      <div className={styles.caption}>Rewards Obtained</div>
      <VialRow ua={ua} />
    </div>
  )
}
