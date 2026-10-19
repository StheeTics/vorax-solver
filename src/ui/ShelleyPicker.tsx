import { useId } from 'react'
import { SHELLEY_LEVELS, instrumentRefreshesFor } from '@/data/shelley'
import styles from './ShelleyPicker.module.css'

/** compact: a smaller, left-aligned picker for a form, with the refresh bonus beside its label. */
export function ShelleyPicker({ level, onChange, compact = false }: { level: number; onChange(level: number): void; compact?: boolean }) {
  const bonus = instrumentRefreshesFor(level)
  // two pickers can be on a page (the Solver's question and its board)
  const labelId = useId()
  // compact, beside the label, it's said briefly so it fits on that line
  const note = (
    <span className={styles.note}>
      +{bonus} {compact ? '' : 'Surgical Instrument '}refresh{bonus === 1 ? '' : 'es'}
    </span>
  )
  return (
    <div className={`${styles.picker} ${compact ? styles.compact : ''}`}>
      <div className={styles.label} id={labelId}>
        Intern Shelley level
        {compact && note}
      </div>
      <div className={styles.levels} role="radiogroup" aria-labelledby={labelId}>
        {SHELLEY_LEVELS.map(l => (
          <button key={l} type="button" role="radio" aria-checked={l === level} className={styles.level} onClick={() => onChange(l)}>
            {l}
          </button>
        ))}
      </div>
      {!compact && <div className={styles.noteRow}>{note}</div>}
    </div>
  )
}
