import { useState } from 'react'
import { loadSettings, normalizeSettings, saveSettings } from './settingsStore'
import type { Settings } from '@/engine/types'
import styles from './Settings.module.css'

interface FieldsProps {
  value: Settings
  onChange(s: Settings): void
}

/** Shared by the Settings screen and the Sandbox setup. */
export function RefreshFields({ value, onChange }: FieldsProps) {
  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(normalizeSettings({ ...value, [k]: Number(e.target.value) }))
  return (
    <div className={styles.fields}>
      <label className={styles.field}>
        <span>Potion refreshes</span>
        <input aria-label="Potion refreshes" type="number" min={0} max={3} value={value.potionRefreshes} onChange={set('potionRefreshes')} />
      </label>
      <label className={styles.field}>
        <span>Instrument refreshes</span>
        <input aria-label="Instrument refreshes" type="number" min={0} max={2} value={value.instrumentRefreshes} onChange={set('instrumentRefreshes')} />
      </label>
    </div>
  )
}

export function SettingsScreen({ onBack }: { onBack(): void }) {
  const [value, setValue] = useState(loadSettings)
  const change = (s: Settings) => {
    setValue(s)
    saveSettings(s)
  }
  return (
    <div className={styles.screen}>
      <div className={`panel-frame ${styles.panel}`}>
        <h2 className={styles.heading}>Settings</h2>
        <p className={styles.hint}>Match these to your talents and Pactspirits. Used for Play and as Sandbox defaults.</p>
        <RefreshFields value={value} onChange={change} />
        <button className="gold-button" style={{ height: 44, width: 160 }} onClick={onBack}>Back</button>
      </div>
    </div>
  )
}
