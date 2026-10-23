import { useEffect, useRef, useState } from 'react'
import type { Advice, ScreenState } from '@/strategy/advisor'
import { runAdvice } from './runAdvice'
import { adviseOn } from './adviseOn'
import { futuresPool } from './pool'

/** A board edited by hand waits this long for the next keystroke; a board read off the screen is advised at once
 *  (a newer board drops the older one's futures anyway). */
const DEBOUNCE_MS = 150

export interface Shown { board: ScreenState; advice: Advice }

/**
 * Advice for a board, its futures played over the CPU cores (futuresPool) so the look-ahead never freezes the page
 * and comes sooner. The last advice stays up, with the board it was worked out for, until the new board's arrives
 * (`updating` meanwhile), so the panel never blanks between rounds; a board with no cards on offer asks for nothing
 * and leaves it up. A newer board drops the older one's futures not yet started.
 */
export function useAdvice(state: ScreenState, read = false): { shown: Shown | null; updating: boolean } {
  const [shown, setShown] = useState<Shown | null>(null)
  const fromRead = useRef(read)
  fromRead.current = read
  const latest = useRef(0)

  useEffect(() => {
    if (state.hand.length === 0) return
    const id = ++latest.current
    const t = setTimeout(() => {
      const show = (a: Advice | null) => {
        if (!a || id !== latest.current) return
        setShown({ board: state, advice: a })
        console.info(`[timing] advice in ${a.ms} ms`)
      }
      const pool = futuresPool()
      if (!pool) return runAdvice(state, show)
      pool.clear('board')
      adviseOn(state, pool, 'board').then(show, e => console.error('advice failed', e))
    }, fromRead.current ? 0 : DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [state])

  // out of date from the render the new board arrives in (not from the timer's), so the last board's green box
  // isn't drawn again for a moment before the new advice comes
  return { shown, updating: state.hand.length > 0 && shown?.board !== state }
}
