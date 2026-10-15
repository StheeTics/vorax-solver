import { SHELLEY_LEVELS, instrumentRefreshesFor } from '@/data/shelley'
import styles from './ShelleyPicker.module.css'

export function ShelleyPicker({ level, onChange }: { level: number; onChange(level: number): void }) {
  const bonus = instrumentRefreshesFor(level)
  return (
    <div className={styles.picker}>
      <div className={styles.label} id="shelley-label">Intern Shelley level</div>
      <div className={styles.levels} role="radiogroup" aria-labelledby="shelley-label">
        {SHELLEY_LEVELS.map(l => (
          <button key={l} type="button" role="radio" aria-checked={l === level} className={styles.level} onClick={() => onChange(l)}>
            {l}
          </button>
        ))}
      </div>
      <div className={styles.note}>
        +{bonus} Surgical Instrument refresh{bonus === 1 ? '' : 'es'}
      </div>
    </div>
  )
}
