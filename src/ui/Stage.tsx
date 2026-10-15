import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { STAGE_H, STAGE_W, stageLayout } from './layout'
import styles from './Stage.module.css'

export { STAGE_W, STAGE_H }

/** Layer inside the stage for popovers, so they scale and rotate with the game. */
export const StageOverlay = createContext<HTMLElement | null>(null)
export const useStageOverlay = () => useContext(StageOverlay)

function measure() {
  // visualViewport is the area actually visible (excludes mobile browser bars).
  const vv = window.visualViewport
  const w = vv?.width ?? window.innerWidth
  const h = vv?.height ?? window.innerHeight
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return stageLayout(w, h, touch)
}

/**
 * Fixed 1600×900 design surface, scaled to fit the visible area and centred.
 * On touch screens held upright it is turned 90° to fill the screen.
 */
export function Stage({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState(measure)
  const [overlay, setOverlay] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const update = () => setLayout(measure())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  const { rotated, scale } = layout
  return (
    <div className={styles.viewport}>
      <div
        className={styles.stage}
        data-testid="stage"
        data-rotated={rotated}
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%, -50%)${rotated ? ' rotate(90deg)' : ''} scale(${scale})`,
          ['--stage-scale' as string]: scale,
        }}
      >
        <StageOverlay.Provider value={overlay}>{children}</StageOverlay.Provider>
        <div ref={setOverlay} className={styles.overlay} />
      </div>
    </div>
  )
}
