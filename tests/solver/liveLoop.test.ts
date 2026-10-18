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
  at(450)
  loop.check()
  const snap = events.find(e => e.type === 'snap')
  expect(snap).toMatchObject({ type: 'snap', kind: 'board', triggerAt: 0, lines: ['[x] ProtoId = 5619'] })
})

it('posts status after each poll', async () => {
  const { queue, events, loop } = setup()
  queue.push(["requested row 'S13GamePlayMain_C_RefreshBtn' x"])
  await loop.poll()
  expect(events.at(-1)).toMatchObject({ type: 'status', detailSeen: true, refreshes: 1, over: false })
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
