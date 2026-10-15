import { useState } from 'react'
import { Footnote } from './Footnote'
import { FullscreenButton } from './FullscreenButton'
import { ShelleyPicker } from './ShelleyPicker'
import { SANDBOX_ENABLED } from './features'
import { loadShelleyLevel, saveShelleyLevel } from './settingsStore'
import styles from './MainMenu.module.css'

interface Props {
  onPlay(): void
  onSandbox(): void
}

export function MainMenu({ onPlay, onSandbox }: Props) {
  const [level, setLevel] = useState(loadShelleyLevel)
  const change = (l: number) => {
    setLevel(l)
    saveShelleyLevel(l)
  }
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
      </div>
      <ShelleyPicker level={level} onChange={change} />
      <FullscreenButton className={`ghost-button ${styles.fsButton}`} />
      <Footnote className={styles.footnote} />
    </div>
  )
}
