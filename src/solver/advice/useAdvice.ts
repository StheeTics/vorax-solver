import { useEffect, useRef, useState } from 'react'
import type { Advice, ScreenState } from '@/strategy/advisor'
import { runAdvice } from './runAdvice'

const DEBOUNCE_MS = 150

/** Advice for a board, from a Web Worker so a planning pass never freezes the page. */
export function useAdvice(state: ScreenState): { advice: Advice | null; refining: boolean } {
  // advice is kept with the board it was worked out for, so an answer for an older board never shows
  const [advice, setAdvice] = useState<{ for: ScreenState; advice: Advice } | null>(null)
  const worker = useRef<Worker | null>(null)
  const latest = useRef(0)
  const asked = useRef(new Map<number, ScreenState>())

  useEffect(() => {
    if (typeof Worker === 'undefined') return
    const w = new Worker(new URL('./adviceWorker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<{ id: number; advice: Advice }>) => {
      const board = asked.current.get(e.data.id)
      if (board && e.data.id === latest.current) setAdvice({ for: board, advice: e.data.advice })
    }
    worker.current = w
    return () => w.terminate()
  }, [])

  useEffect(() => {
    const id = ++latest.current
    const t = setTimeout(() => {
      asked.current.clear()
      asked.current.set(id, state)
      if (worker.current) worker.current.postMessage({ id, state })
      else runAdvice(state, a => id === latest.current && setAdvice({ for: state, advice: a }))
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [state])

  const current = advice && advice.for === state ? advice.advice : null
  return { advice: current, refining: !!current && !current.final }
}
