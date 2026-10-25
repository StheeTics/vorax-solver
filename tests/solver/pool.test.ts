import { advise, playWork, type ScreenState } from '@/strategy/advisor'
import { adviseOn, futuresFor } from '@/solver/advice/adviseOn'
import { createPool, type WorkerLike } from '@/solver/advice/pool'

const M = (archetype: 'pest' | 'agito' | 'boneSentry', rarity: 'normal' | 'magic' | 'rare', activity: number, quantity: number) => ({ archetype, rarity, activity, quantity })
const potionBoard: ScreenState = { tanks: [M('pest', 'magic', 45, 300), M('pest', 'normal', 20, 250), M('agito', 'rare', 60, 150), M('boneSentry', 'normal', 10, 200), null, null], hand: ['Eggshell Powder', 'Xenopurge Powder', 'Viscous Bile Solution'], instruments: ['Incubation Sac'], phase: 'potion', round: 3, potionRefreshes: 3, instrumentRefreshes: 2 }
const instrumentBoard: ScreenState = { ...potionBoard, phase: 'instrument', hand: ['Clustered Eggs', 'Sinew Garrote', 'Pig Iron Bone Saw'] }

/** A pool that plays its slices on this thread, as the workers would. */
const here = (size: number) => ({ size, run: async (job: { work: Parameters<typeof playWork>[0]; from: number; to: number }) => playWork(job.work, job.from, job.to), clear: () => {}, terminate: () => {} })
const noTime = (a: { ms: number } | null) => a && { ...a, ms: 0 }

describe('advice over several CPU cores', () => {
  it('a potion board: the same advice as on one (16 threads: the full 64 futures)', async () => {
    expect(noTime(await adviseOn(potionBoard, here(15)))).toEqual(noTime(advise(potionBoard, 16, true)))
  }, 60_000)
  it('an instrument board: the same advice as on one (16 threads: the full 64 futures)', async () => {
    expect(noTime(await adviseOn(instrumentBoard, here(15)))).toEqual(noTime(advise(instrumentBoard)))
  }, 60_000)
})

describe('the worker pool', () => {
  // workers that answer when told to
  const spawned: { got: { id: number }[]; w: WorkerLike }[] = []
  const spawn = (): WorkerLike => {
    const me = { got: [] as { id: number }[], w: { onmessage: null, postMessage: (m: { id: number }) => me.got.push(m), terminate: () => {} } as WorkerLike }
    spawned.push(me)
    return me.w
  }
  const answer = (i: number) => { const m = spawned[i].got.shift()!; spawned[i].w.onmessage?.({ data: { id: m.id, tallies: [{ goal: m.id, reached: 0, n: 1 }] } } as MessageEvent) }
  const job = { work: null as never, from: 0, to: 1 }
  beforeEach(() => void (spawned.length = 0))

  it('gives each worker one slice at a time and queues the rest', async () => {
    const pool = createPool(2, spawn)
    const done = [pool.run(job), pool.run(job), pool.run(job)]
    expect(spawned.map(s => s.got.length)).toEqual([1, 1])
    answer(0)
    await done[0]
    expect(spawned.map(s => s.got.length)).toEqual([1, 1])
    answer(0); answer(1)
    expect((await Promise.all(done)).every(t => t && t.length === 1)).toBe(true)
  })
  it('drops the slices still queued for a board that is no longer on screen', async () => {
    const pool = createPool(1, spawn)
    const old = [pool.run(job, 'board'), pool.run(job, 'board')]
    pool.clear('board')
    answer(0)
    expect(await old[0]).not.toBeNull()
    expect(await old[1]).toBeNull()
    expect(spawned[0].got).toHaveLength(0)
  })
})

describe('futures scaled to the CPU', () => {
  it('in JavaScript, 64 from 8 threads up, 32 below', () => {
    expect([2, 4, 7, 8, 12, 16, 32].map(t => futuresFor(t))).toEqual([32, 32, 32, 64, 64, 64, 64])
  })
  it('in WebAssembly, 500 from 8 threads up, 250 below', () => {
    expect([1, 2, 4, 7, 8, 12, 16, 32].map(t => futuresFor(t, true))).toEqual([250, 250, 250, 250, 500, 500, 500, 500])
  })
  it('a PC with fewer threads plays fewer futures per option, so the wait stays about the same', async () => {
    const played = { potion: 0, instrument: 0 }
    const counting = (size: number) => ({ ...here(size), run: async (job: { work: Parameters<typeof playWork>[0]; from: number; to: number }) => { played[job.work.kind] += job.to - job.from; return playWork(job.work, job.from, job.to) } })
    await adviseOn(potionBoard, counting(3))
    await adviseOn(instrumentBoard, counting(3))
    expect(played).toEqual({ potion: 32, instrument: 32 })
  }, 60_000)
})
