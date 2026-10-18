import { useState } from 'react'
import { loadShare, saveShare } from './shareStore'
import styles from './ShareSwitch.module.css'

export function ShareSwitch() {
  const [on, setOn] = useState(loadShare)
  return (
    <label className={styles.share}>
      <input type="checkbox" checked={on} onChange={e => (setOn(e.target.checked), saveShare(e.target.checked))} />
      Share card data to improve the odds
      <span className={styles.note}>The boards it reads, with no picture and nothing about you.</span>
    </label>
  )
}
