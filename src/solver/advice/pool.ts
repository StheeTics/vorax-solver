// Workers that play slices of the advice's futures at once, one per spare CPU core: the advice is worked out in the
// minigame, where the game's frame rate doesn't matter, so it may use them all but one.
import type { Tally } from '@/strategy/bot'
import type { Work } from '@/strategy/advisor'

export interface WorkerLike {
  postMessage(m: unknown): void
  onmessage: ((e: MessageEvent) => void) | null
  terminate(): void
}

/** Futures `from` to `to` (excluded) of a board's work. */
export interface Slice { work: Work; from: number; to: number }

export interface Pool {
  size: number
  /** The slice's totals; null when it was dropped (clear) before a worker took it. */
  run(slice: Slice, tag?: string): Promise<Tally[] | null>
  /** Drops the slices with this tag that no worker has taken yet (a board no longer on screen). */
  clear(tag: string): void
  terminate(): void
}

interface Queued { slice: Slice; tag?: string; id: number; done: (t: Tally[] | null) => void }

export function createPool(size: number, spawn: () => WorkerLike): Pool {
  const idle: WorkerLike[] = []
  const busy = new Map<WorkerLike, Queued>()
  const queue: Queued[] = []
  let ids = 0
  const next = () => {
    while (idle.length && queue.length) {
      const w = idle.shift()!, q = queue.shift()!
      busy.set(w, q)
      w.postMessage({ id: q.id, ...q.slice })
    }
  }
  const workers = Array.from({ length: size }, () => {
    const w = spawn()
    w.onmessage = (e: MessageEvent<{ id: number; tallies: Tally[] }>) => {
      const q = busy.get(w)
      busy.delete(w)
      idle.push(w)
      q?.done(e.data.tallies)
      next()
    }
    idle.push(w)
    return w
  })
  return {
    size,
    run: (slice, tag) => new Promise(done => { queue.push({ slice, tag, id: ++ids, done }); next() }),
    clear(tag) {
      for (let i = queue.length - 1; i >= 0; i--) if (queue[i].tag === tag) queue.splice(i, 1)[0].done(null)
    },
    terminate: () => workers.forEach(w => w.terminate()),
  }
}

/** All CPU cores but one (the game's), at least 1. */
export const poolSize = () => Math.max(1, Math.min(16, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4) - 1)

let shared: Pool | null = null
/** The page's one pool (the advice for the board and the advice for each instrument an unsure pick could be share it);
 *  null where there are no workers (tests). */
export function futuresPool(): Pool | null {
  if (typeof Worker === 'undefined') return null
  shared ??= createPool(poolSize(), () => new Worker(new URL('./futuresWorker.ts', import.meta.url), { type: 'module' }) as WorkerLike)
  return shared
}
