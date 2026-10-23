// @vitest-environment jsdom
import { follow } from '@/solver/live/LiveSource'
import { DEFAULT_RULES } from '@/solver/live/triggers'
import type { FileLike } from '@/solver/live/logFollower'
import type { LiveEvent } from '@/solver/live/liveLoop'

/** a log the test writes to; counts the reads */
function fakeLog() {
  let text = ''
  let reads = 0
  const handle: FileLike = {
    async getFile() {
      const bytes = new TextEncoder().encode(text)
      return { size: bytes.length, slice: (a: number, b?: number) => ({ arrayBuffer: async () => (reads++, bytes.slice(a, b).buffer) }) }
    },
  }
  return { handle, write: (s: string) => (text += s), reads: () => reads }
}
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }
const BOARD = '[2026.10.23-04.27.21:522][175]TLLua: Display: [Game] PushMgr:RecvPushCombineMsg ProtoId = 5619, SynId = 7079\n'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('the app’s word that the log changed', () => {
  it('reads the new lines at once, not at the next poll', async () => {
    const log = fakeLog()
    let wake = () => {}
    const events: LiveEvent[] = []
    const f = follow(log.handle, e => events.push(e), DEFAULT_RULES, cb => ((wake = cb), () => {}))
    await vi.advanceTimersByTimeAsync(250) // the first poll notes where the log ends
    log.write(BOARD)
    wake()
    await flush()
    expect(events.some(e => e.type === 'changed')).toBe(true)
    f.stop()
  })
  it('never reads twice at once: a wake-up during a read reads again after it', async () => {
    const log = fakeLog()
    let wake = () => {}
    const events: LiveEvent[] = []
    const f = follow(log.handle, e => events.push(e), DEFAULT_RULES, cb => ((wake = cb), () => {}))
    await vi.advanceTimersByTimeAsync(250)
    log.write(BOARD)
    wake()
    wake()
    wake()
    await flush()
    await flush()
    expect(events.filter(e => e.type === 'changed')).toHaveLength(1)
    f.stop()
  })
  it('without it, or when it fails, the poll reads the log as before', async () => {
    for (const wake of [undefined, () => { throw new Error('no IPC') }]) {
      const log = fakeLog()
      const events: LiveEvent[] = []
      const f = follow(log.handle, e => events.push(e), DEFAULT_RULES, wake)
      await vi.advanceTimersByTimeAsync(250)
      log.write(BOARD)
      await vi.advanceTimersByTimeAsync(250)
      expect(events.some(e => e.type === 'changed')).toBe(true)
      f.stop()
    }
  })
})
