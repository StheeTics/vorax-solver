import { Footnote } from './Footnote'
import { SANDBOX_ENABLED } from './features'
import styles from './MainMenu.module.css'

interface Props {
  onPlay(): void
  onSandbox(): void
  onSettings(): void
}

export function MainMenu({ onPlay, onSandbox, onSettings }: Props) {
  return (
    <div className={styles.menu}>
      <div className={styles.titleBlock}>
        <div className={styles.kicker}>Torchlight Infinite · Vorax</div>
        <h1 className={styles.title}>Surgical Preparation</h1>
        <div className={styles.sub}>Practice simulator</div>
      </div>
      <div className={styles.buttons}>
        <button className={`gold-button ${styles.big}`} onClick={onPlay}>Play</button>
        {SANDBOX_ENABLED && <button className={`ghost-button ${styles.big}`} onClick={onSandbox}>Sandbox</button>}
        <button className={`ghost-button ${styles.big}`} onClick={onSettings}>Settings</button>
      </div>
      <Footnote className={styles.footnote} />
    </div>
  )
}
