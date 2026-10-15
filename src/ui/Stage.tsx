import { useEffect, useState, type ReactNode } from 'react'
import styles from './Stage.module.css'

export const STAGE_W = 1600
export const STAGE_H = 900

function fit() {
  return Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)
}

/** Fixed 1600×900 design surface, scaled to fit the window and letterboxed. */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(fit)
  useEffect(() => {
    const onResize = () => setScale(fit())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return (
    <div className={styles.viewport}>
      <div className={styles.stage} style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}
