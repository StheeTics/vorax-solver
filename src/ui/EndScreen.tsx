import type { GameState } from '@/engine/types'
import { ultimateActivity } from '@/engine/game'
import { instrument } from '@/data/instruments'
import { formatNumber } from './format'
import { HeartIcon } from './svg/icons'
import { VialRow } from './game/StatusPanel'
import { IssueLink } from './IssueLink'
import styles from './EndScreen.module.css'

interface Props {
  final: GameState
  sandbox: boolean
  onRestart(): void
  onReplaySetup(): void
  onMenu(): void
}

export function EndScreen({ final, sandbox, onRestart, onReplaySetup, onMenu }: Props) {
  return (
    <div className={styles.screen}>
      <div className={`panel-frame ${styles.panel}`}>
        <div className={styles.kicker}>Surgery complete</div>
        <div className={styles.caption}><HeartIcon size={18} /> Ultimate Activity</div>
        <div className={styles.score} data-testid="final-score">{formatNumber(ultimateActivity(final))}</div>
        <VialRow ua={ultimateActivity(final)} size={40} />
        <div className={styles.instruments}>
          {final.instruments.map(i => (
            <span key={i.id}>{instrument(i.id)?.name} <em>(round {i.acquiredRound})</em></span>
          ))}
        </div>
        <div className={styles.buttons}>
          <button className="gold-button" onClick={onRestart}>{sandbox ? 'New random run' : 'Play again'}</button>
          {sandbox && <button className="gold-button" onClick={onReplaySetup}>Replay setup</button>}
          <button className="ghost-button" onClick={onMenu}>Main menu</button>
        </div>
        <p className={styles.report}>Something doesn't match the game? <IssueLink className={styles.link} /></p>
      </div>
    </div>
  )
}
