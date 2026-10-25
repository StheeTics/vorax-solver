import { addTallies, conclude, prepare, type Advice, type ScreenState } from '@/strategy/advisor'
import { futuresPool, type Pool } from './pool'
import { wasmFutures } from './wasm'

/** Slices per worker: small ones keep every worker busy to the end (in Edge on 16 threads, a round-1 potion board
 *  took ~570 ms at 4 against ~900 at 1, and 3.9 s on one core). */
const SLICES_PER_WORKER = 4

/** Futures per option for a PC with this many CPU threads: played in WebAssembly (~12x faster), 500 from 8 threads up and
 *  250 below, so a slow PC isn't kept waiting; in JavaScript, where WebAssembly can't load, 64 and 32. `?futures=<n>` on
 *  the page's address (or localStorage vorax.futures) sets it, for trying other numbers. */
export const futuresFor = (threads: number, wasm = false) => futuresSet() ?? (wasm ? (threads >= 8 ? 500 : 250) : threads >= 8 ? 64 : 32)
function futuresSet(): number | null {
  try {
    const v = Number(new URLSearchParams(globalThis.location?.search ?? '').get('futures') ?? globalThis.localStorage?.getItem('vorax.futures'))
    return Number.isInteger(v) && v > 0 ? Math.min(v, 20000) : null
  } catch {
    return null
  }
}

/**
 * A board's advice with its futures played over the pool's workers, in small slices: the same advice as
 * advise() on one thread when the pool is big enough for the full futures, sooner. Null when its slices were dropped (`tag` cleared: a newer board came).
 */
export async function adviseOn(x: ScreenState, pool: Pick<Pool, 'size' | 'run'>, tag?: string): Promise<Advice | null> {
  // the pool has a worker per thread but one (poolSize)
  const wasm = await wasmFutures()
  const p = prepare(x, futuresFor(pool.size + 1, wasm))
  if ('advice' in p) return p.advice
  const n = p.work.futures, k = Math.min(pool.size * SLICES_PER_WORKER, n)
  const parts = await Promise.all(Array.from({ length: k }, (_, i) => pool.run({ work: p.work, from: Math.floor((i * n) / k), to: Math.floor(((i + 1) * n) / k) }, tag)))
  if (parts.some(t => t === null)) return null
  const advice = conclude(p, addTallies(parts as NonNullable<(typeof parts)[number]>[]))
  const options = p.work.kind === 'potion' ? p.work.opts.length : p.work.choices.length
  console.info(`[timing] advice: round ${x.round} ${p.work.kind}, ${options} options x ${n} futures in ${wasm ? 'WebAssembly' : 'JavaScript'} on ${pool.size} workers: ${advice.ms} ms`)
  return advice
}

/** A round-5 potion board: enough look-ahead (~3.5 s on one core) that every worker runs it long enough to be optimized. */
const PRACTICE: ScreenState = {
  tanks: Array.from({ length: 6 }, () => ({ archetype: 'pest' as const, rarity: 'magic' as const, activity: 81, quantity: 340 })),
  hand: ['Mutagenic Powder', 'Green Bile Solution', 'Bewitching Tincture'],
  instruments: [],
  phase: 'potion',
  round: 5,
}

/**
 * Starts the workers and plays a practice board over them, a slice each, so the first real board doesn't pay for
 * starting them and for the look-ahead's code still running unoptimized (~200 ms against ~50 on later boards).
 */
export async function warmUp(): Promise<void> {
  const pool = futuresPool()
  if (!pool) return
  const t0 = Date.now()
  const p = prepare(PRACTICE, futuresFor(pool.size + 1, await wasmFutures()))
  if ('advice' in p) return
  const n = p.work.futures, k = Math.min(pool.size, n)
  await Promise.all(Array.from({ length: k }, (_, i) => pool.run({ work: p.work, from: Math.floor((i * n) / k), to: Math.floor(((i + 1) * n) / k) }, 'warm')))
  console.info(`[timing] warm-up: advice workers ready in ${Date.now() - t0} ms`)
}
