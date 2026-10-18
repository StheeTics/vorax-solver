import { useEffect, useRef, useState } from 'react'
import type { Advice, ScreenState } from '@/strategy/advisor'
import { runAdvice } from './runAdvice'

const DEBOUNCE_MS = 150

export interface Shown { board: ScreenState; advice: Advice }

/**
 * Advice for a board, from a Web Worker so the look-ahead never freezes the page. The last advice stays up,
 * with the board it was worked out for, until the new board's arrives (`updating` meanwhile), so the panel
 * never blanks between rounds; a board with no cards on offer asks for nothing and leaves it up.
 */
export function useAdvice(state: ScreenState): { shown: Shown | null; updating: boolean } {
  const [shown, setShown] = useState<Shown | null>(null)
  const [wanted, setWanted] = useState<ScreenState | null>(null)
  const worker = useRef<Worker | null>(null)
  const latest = useRef(0)
  const asked = useRef(new Map<number, ScreenState>())

  useEffect(() => {
    if (typeof Worker === 'undefined') return
    const w = new Worker(new URL('./adviceWorker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<{ id: number; advice: Advice }>) => {
      const board = asked.current.get(e.data.id)
      if (board && e.data.id === latest.current) setShown({ board, advice: e.data.advice })
      if (board) console.info(`[timing] advice in ${e.data.advice.ms} ms`)
    }
    worker.current = w
    return () => w.terminate()
  }, [])

  useEffect(() => {
    if (state.hand.length === 0) return
    const id = ++latest.current
    const t = setTimeout(() => {
      setWanted(state)
      asked.current.clear()
      asked.current.set(id, state)
      if (worker.current) worker.current.postMessage({ id, state })
      else runAdvice(state, a => id === latest.current && setShown({ board: state, advice: a }))
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [state])

  return { shown, updating: !!wanted && shown?.board !== wanted }
}
