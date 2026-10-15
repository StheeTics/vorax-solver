import { formatNumber } from '../format'
import styles from './FloatingDelta.module.css'

export interface Delta {
  id: number
  tank: number
  /** Change in Total Activity; NaN-free integer. */
  value: number
}

export function FloatingDelta({ delta }: { delta: Delta }) {
  const up = delta.value >= 0
  return (
    <div className={styles.delta} data-up={up}>
      {up ? '+' : '−'}{formatNumber(Math.abs(delta.value))}
    </div>
  )
}
