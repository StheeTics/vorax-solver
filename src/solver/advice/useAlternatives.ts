import { useEffect, useRef, useState } from 'react'
import type { Advice, ScreenState } from '@/strategy/advisor'
import { runAdvice } from './runAdvice'
import { adviseOn } from './adviseOn'
import { futuresPool } from './pool'
import type { Alternative } from './depends'

/**
 * Advice for the same board with each instrument an unconfirmed pick could be (only while such a pick is open: at
 * most three look-aheads), their futures played over the CPU cores beside the board's own. Null until every option
 * has its advice. Without workers they'd block the page, so there are none (tests pass `run`).
 */
export function useAlternatives(options: { name: string; board: ScreenState }[] | null, run?: typeof runAdvice): Alternative[] | null {
  const [done, setDone] = useState<Alternative[] | null>(null)
  const round = useRef(0)
  const key = options ? JSON.stringify(options) : ''

  useEffect(() => {
    const id = ++round.current
    setDone(null)
    const pool = run ? null : futuresPool()
    pool?.clear('alternatives')
    if (!options || options.length < 2 || options[0].board.hand.length === 0) return
    const got: (Advice | undefined)[] = []
    const finish = (i: number, a: Advice | null) => {
      if (id !== round.current || !a) return
      got[i] = a
      if (options.every((_, j) => got[j])) setDone(options.map((o, j) => ({ ...o, advice: got[j]! })))
    }
    if (!pool) {
      options.forEach((o, i) => run?.(o.board, a => finish(i, a)))
      return
    }
    options.forEach((o, i) => adviseOn(o.board, pool, 'alternatives').then(a => finish(i, a), e => console.error('advice failed', e)))
  }, [key])

  return done
}
