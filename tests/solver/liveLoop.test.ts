import { createLiveLoop, type LiveEvent } from '@/solver/live/liveLoop'
import type { Follower } from '@/solver/live/logFollower'

function setup() {
  const queue: string[][] = []
  const follower: Follower = { poll: async () => queue.shift() ?? [], detailSeen: true }
  const events: LiveEvent[] = []
  let now = 0
  const loop = createLiveLoop({ follower, now: () => now, post: e => events.push(e) })
  return { queue, events, loop, at: (t: number) => (now = t) }
}

it('posts a snap with the lines that triggered it once the board settles', async () => {
  const { queue, events, loop, at } = setup()
  queue.push(['[x] ProtoId = 5619', 'unrelated'])
  await loop.poll()
  at(100)
  loop.check()
  expect(events.filter(e => e.type === 'snap')).toHaveLength(0)
  // no deal logged: the board waits for one up to 1 s, then the silence counts
  at(999)
  loop.check()
  expect(events.filter(e => e.type === 'snap')).toHaveLength(0)
  at(1000)
  loop.check()
  const snap = events.find(e => e.type === 'snap')
  expect(snap).toMatchObject({ type: 'snap', kind: 'board', triggerAt: 0, lines: ['[x] ProtoId = 5619'] })
})

it('posts status after each poll', async () => {
  const { queue, events, loop } = setup()
  queue.push(["requested row 'S13GamePlayMain_C_RefreshBtn' x"])
  await loop.poll()
  expect(events.at(-1)).toMatchObject({ type: 'status', detailSeen: true, refreshes: 1, over: false, finished: false })
})

it('snapNow posts a manual snap at once', () => {
  const { events, loop } = setup()
  loop.snapNow()
  expect(events).toContainEqual(expect.objectContaining({ type: 'snap', kind: 'manual' }))
})

it('cancel drops a pending snap', async () => {
  const { queue, events, loop, at } = setup()
  queue.push(['ProtoId = 5619'])
  await loop.poll()
  loop.cancel()
  at(5000)
  loop.check()
  expect(events.filter(e => e.type === 'snap')).toHaveLength(0)
})

it('says at once that a new board came in, before it settles', async () => {
  const { queue, events, loop } = setup()
  queue.push(['[x] ProtoId = 5619'])
  await loop.poll()
  expect(events).toContainEqual({ type: 'changed', kind: 'board', at: 0 })
  expect(events.filter(e => e.type === 'snap')).toHaveLength(0)
})

it('says why the board counts as settled: numbers landed, a click, quiet, or out of time', async () => {
  const settle = async (lines: string[], t: number) => {
    const { queue, events, loop, at } = setup()
    queue.push(['[x] ProtoId = 5619', ...lines])
    await loop.poll()
    at(t)
    loop.check()
    return events.find(e => e.type === 'snap')
  }
  expect(await settle(['Play_UI_S13_KYZ_Card_Figure_Refresh'], 200)).toMatchObject({ kind: 'board', why: 'done' })
  expect(await settle(['normal-click SelectBtn'], 10)).toMatchObject({ why: 'acted' })
  expect(await settle(['Play_UI_S13_KYZ_Card_Selected_Shuffle'], 100)).toMatchObject({ why: 'dealt' })
  expect(await settle([], 1000)).toMatchObject({ why: 'quiet' })
})
