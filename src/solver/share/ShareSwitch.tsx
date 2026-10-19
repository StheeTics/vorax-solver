import { useState } from 'react'
import { loadShare, saveShare } from './shareStore'
import styles from './ShareSwitch.module.css'

/** Whether the boards it reads are shared (what is shared is told under "What can this see?"). */
export function ShareSwitch() {
  const [on, setOn] = useState(loadShare)
  return (
    <label className={styles.share}>
      <input type="checkbox" role="switch" className={styles.input} checked={on} onChange={e => (setOn(e.target.checked), saveShare(e.target.checked))} />
      <span className={styles.track} aria-hidden="true" />
      Share boards to improve the odds
    </label>
  )
}
