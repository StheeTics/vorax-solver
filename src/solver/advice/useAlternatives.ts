import { useEffect, useRef, useState } from 'react'
import type { Advice, ScreenState } from '@/strategy/advisor'
import { runAdvice } from './runAdvice'
import type { Alternative } from './depends'

/**
 * Advice for the same board with each instrument an unconfirmed pick could be, one after another in a worker of
 * its own (only while such a pick is open: at most three look-aheads). Null until every option has its advice.
 * Without workers they'd block the page, so there are none (tests pass `run`).
 */
export function useAlternatives(options: { name: string; board: ScreenState }[] | null, run?: typeof runAdvice): Alternative[] | null {
  const [done, setDone] = useState<Alternative[] | null>(null)
  const worker = useRef<Worker | null>(null)
  const round = useRef(0)
  const key = options ? JSON.stringify(options) : ''

  useEffect(() => () => worker.current?.terminate(), [])

  useEffect(() => {
    const id = ++round.current
    setDone(null)
    if (!options || options.length < 2 || options[0].board.hand.length === 0) return
    const got: (Advice | undefined)[] = []
    const finish = (i: number, a: Advice) => {
      if (id !== round.current) return
      got[i] = a
      if (options.every((_, j) => got[j])) setDone(options.map((o, j) => ({ ...o, advice: got[j]! })))
    }
    if (run || typeof Worker === 'undefined') {
      options.forEach((o, i) => run?.(o.board, a => finish(i, a)))
      return
    }
    if (!worker.current) worker.current = new Worker(new URL('./adviceWorker.ts', import.meta.url), { type: 'module' })
    const w = worker.current
    w.onmessage = (e: MessageEvent<{ id: number; advice: Advice }>) => {
      const i = e.data.id - id * 10
      if (i >= 0 && i < options.length) finish(i, e.data.advice)
    }
    options.forEach((o, i) => w.postMessage({ id: id * 10 + i, state: o.board }))
  }, [key])

  return done
}
