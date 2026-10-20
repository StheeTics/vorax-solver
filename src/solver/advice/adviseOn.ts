import { addTallies, conclude, prepare, type Advice, type ScreenState } from '@/strategy/advisor'
import type { Pool } from './pool'

/** Slices per worker: small ones keep every worker busy to the end (in Edge on 16 threads, a round-1 potion board
 *  took ~570 ms at 4 against ~900 at 1, and 3.9 s on one core). */
const SLICES_PER_WORKER = 4

/**
 * A board's advice with its futures played over the pool's workers, in small slices: the same advice as
 * advise() on one thread, sooner. Null when its slices were dropped (`tag` cleared: a newer board came).
 */
export async function adviseOn(x: ScreenState, pool: Pick<Pool, 'size' | 'run'>, tag?: string): Promise<Advice | null> {
  const p = prepare(x)
  if ('advice' in p) return p.advice
  const n = p.work.futures, k = Math.min(pool.size * SLICES_PER_WORKER, n)
  const parts = await Promise.all(Array.from({ length: k }, (_, i) => pool.run({ work: p.work, from: Math.floor((i * n) / k), to: Math.floor(((i + 1) * n) / k) }, tag)))
  return parts.some(t => t === null) ? null : conclude(p, addTallies(parts as NonNullable<(typeof parts)[number]>[]))
}
