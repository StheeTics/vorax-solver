import { shareable, startsRun, toSnapshot, unsureFields, type Snapshot } from '@/solver/share/snapshot'
import { createQueue } from '@/solver/share/queue'
import { appTag, sendingAllowed } from '@/solver/share/endpoint'
import { loadShare, saveShare } from '@/solver/share/shareStore'
import { emptyState, type Reading } from '@/solver/types'

const reading: Reading = {
  state: { ...emptyState(), round: 3, hand: ['Xeno-Hormone'], instruments: ['Hypertrophic Pituitary'], potionRefreshes: 2, tanks: [{ archetype: 'pest', rarity: 'magic', activity: 5, quantity: 24 }, null, null, null, null, null] },
  fields: { round: { sure: true }, hand0: { sure: true } },
  problems: [],
  frame: { width: 3440, height: 1440, trigger: 'board' },
}
const ctx = { run: 'r1', seq: 2, app: 'abc', source: 'live' as const, trigger: 'board', shelley: 6, corrected: [], unsure: [] }

describe('what is shared', () => {
  it('every board read from the game, unsure fields and all; never Manual boards or screens that aren’t the game', () => {
    expect(shareable(reading, 'demo')).toBe(false)
    expect(shareable(reading, 'live')).toBe(true)
    expect(shareable({ ...reading, fields: { ...reading.fields, hand0: { sure: false } } }, 'live')).toBe(true)
    expect(shareable({ ...reading, problems: [{ kind: 'unknownArt', field: 'hand1', crop: { x: 0, y: 0, w: 1, h: 1 } }] }, 'live')).toBe(true)
    // a picture that isn't the game screen is shared too (flagged): a setup that breaks every read shows up
    expect(shareable({ ...reading, problems: [{ kind: 'notFound' }] }, 'live')).toBe(true)
  })

  it('the fields shared as unsure: those the reader wasn’t sure of and the player didn’t correct, and cards it didn’t recognise', () => {
    const unsure = { ...reading, fields: { ...reading.fields, hand0: { sure: false }, 'tank0.activity': { sure: false } } }
    expect(unsureFields(unsure, [])).toEqual(['hand0', 'tank0.activity'])
    expect(unsureFields(unsure, ['hand0'])).toEqual(['tank0.activity'])
    expect(unsureFields(reading, [])).toEqual([])
    expect(unsureFields({ ...reading, problems: [{ kind: 'unknownArt', field: 'hand1', crop: { x: 0, y: 0, w: 1, h: 1 } }] }, [])).toEqual(['hand1'])
  })

  it('a picture that isn’t the game screen is flagged unreadable', () => {
    expect(toSnapshot({ ...reading, problems: [{ kind: 'notFound' }] }, ctx).unreadable).toBe(true)
    expect(toSnapshot(reading, ctx)).not.toHaveProperty('unreadable')
  })

  it('a snapshot names its unsure fields', () => {
    expect(toSnapshot(reading, { ...ctx, unsure: ['hand0'] }).unsure).toEqual(['hand0'])
  })

  it('the round-13 Surgical Protocol is a game’s final board: shared at once, so every finished game has its final score', async () => {
    const { isFinalBoard } = await import('@/solver/share/snapshot')
    expect(isFinalBoard({ ...reading, state: { ...reading.state, phase: 'protocol', round: 13 } })).toBe(true)
    expect(isFinalBoard({ ...reading, state: { ...reading.state, phase: 'protocol', round: 11 } })).toBe(false)
    expect(isFinalBoard(reading)).toBe(false)
  })

  it('a run starts at the game screen or a round-1 instrument offer', () => {
    expect(startsRun(reading, 'screen')).toBe(true)
    expect(startsRun({ ...reading, state: { ...reading.state, phase: 'instrument', round: 1 } }, 'board')).toBe(true)
    expect(startsRun(reading, 'board')).toBe(false)
  })

  it('a snapshot copies the board and carries no time and nothing about the player', () => {
    const s = toSnapshot(reading, ctx)
    expect(s).toMatchObject({ run: 'r1', seq: 2, app: 'abc', source: 'live', trigger: 'board', round: 3, phase: 'potion', refreshes: 2, hand: ['Xeno-Hormone'], instruments: ['Hypertrophic Pituitary'], shelley: 6, corrected: [], unsure: [] })
    expect(s.tanks[0]).toEqual({ archetype: 'pest', rarity: 'magic', activity: 5, quantity: 24 })
    expect(s.uid).toMatch(/^[0-9a-f-]{20,}$/)
    for (const k of ['time', 'at', 'date', 'frame', 'width']) expect(s).not.toHaveProperty(k)
  })

  it('a snapshot carries the advice shown for that board, to check predictions against real games', () => {
    const advice = { move: 'Play Xeno-Hormone (card 1) → tank 2', activity: 812_000, reached: 0.4 }
    expect(toSnapshot(reading, { ...ctx, advice }).advice).toEqual(advice)
    expect(toSnapshot(reading, ctx)).not.toHaveProperty('advice')
  })

  it('the advice to share: the move in words and its prediction', async () => {
    const { sharedAdvice } = await import('@/solver/share/snapshot')
    const board = { ...reading.state, hand: ['Xeno-Hormone', 'Mutagenic Powder'] }
    const best = { index: 1, targets: [0], value: 1, end: { activity: 812_000.4, reached: 0.4 } }
    expect(sharedAdvice({ board, advice: { best, ranking: [best], board: 0, plan: true, final: true, ms: 1, unknown: [] } })).toEqual({ move: 'Play Mutagenic Powder (card 2) → tank 1', activity: 812_000, reached: 0.4 })
    expect(sharedAdvice({ board, advice: { best: 'refresh', ranking: [], board: 0, plan: true, final: true, ms: 1, unknown: [], refreshEnd: { activity: 500_000, reached: 0.1 } } })).toEqual({ move: 'Refresh', activity: 500_000, reached: 0.1 })
    expect(sharedAdvice(null)).toBeUndefined()
  })
})

describe('the upload queue', () => {
  const snap = (n: number) => ({ uid: `u${n}` }) as Snapshot
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('sends 10 at once', async () => {
    const send = vi.fn(async () => true)
    const q = createQueue({ send })
    for (let i = 0; i < 10; i++) q.add(snap(i))
    await vi.advanceTimersByTimeAsync(0)
    expect(send).toHaveBeenCalledTimes(1)
    expect((send.mock.calls[0] as unknown as Snapshot[][])[0]).toHaveLength(10)
    expect(q.pending()).toBe(0)
  })

  it('sends a partial batch 20 s after the last board', async () => {
    const send = vi.fn(async () => true)
    const q = createQueue({ send })
    q.add(snap(1))
    await vi.advanceTimersByTimeAsync(19_000)
    expect(send).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('retries a failed send after 5 s, then 10 s', async () => {
    const send = vi.fn(async () => false)
    const q = createQueue({ send })
    for (let i = 0; i < 10; i++) q.add(snap(i))
    await vi.advanceTimersByTimeAsync(0)
    expect(send).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(send).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(9_000)
    expect(send).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(send).toHaveBeenCalledTimes(3)
    expect(q.pending()).toBe(10)
  })

  it('keeps at most 300, dropping the oldest', () => {
    const q = createQueue({ send: async () => false })
    for (let i = 0; i < 305; i++) q.add(snap(i))
    expect(q.pending()).toBe(300)
  })

  it('survives a throwing localStorage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    const q = createQueue({ send: async () => true })
    expect(() => q.add(snap(1))).not.toThrow()
    vi.restoreAllMocks()
  })

  it('picks up boards a previous visit left unsent', () => {
    createQueue({ send: async () => false }).add(snap(1))
    expect(createQueue({ send: async () => false }).pending()).toBe(1)
  })
})

it('nothing is sent from this PC, a dev build or before the collector exists', () => {
  expect(sendingAllowed({ hostname: 'localhost' }, 'https://x.workers.dev', false)).toBe(false)
  expect(sendingAllowed({ hostname: '127.0.0.1' }, 'https://x.workers.dev', false)).toBe(false)
  expect(sendingAllowed({ hostname: 'tidewarden.github.io' }, '', false)).toBe(false)
  expect(sendingAllowed({ hostname: 'tidewarden.github.io' }, 'https://x.workers.dev', true)).toBe(false)
  expect(sendingAllowed({ hostname: 'tidewarden.github.io' }, 'https://x.workers.dev', false)).toBe(true)
})

it('inside Vorax Overlay, games are shared even from a local or dev copy of the site: they are real games', () => {
  expect(sendingAllowed({ hostname: 'localhost' }, 'https://x.workers.dev', true, true)).toBe(true)
  expect(sendingAllowed({ hostname: 'localhost' }, '', true, true)).toBe(false)
})

it('boards shared from Vorax Overlay say so in their version', () => {
  expect(appTag('359bd6c', true)).toBe('359bd6c-overlay')
  expect(appTag('359bd6c', false)).toBe('359bd6c')
  expect(appTag('359bd6c', true)).toMatch(/^[\w.-]{1,24}$/)
})

it('sharing is on by default and the choice is remembered', () => {
  localStorage.clear()
  expect(loadShare()).toBe(true)
  saveShare(false)
  expect(loadShare()).toBe(false)
})

describe('the setup and what the reader saw, shared to find out why a setup misreads', () => {
  it('names the browser and its version from the user agent: no more', async () => {
    const { browserOf } = await import('@/solver/share/setup')
    expect(browserOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.70')).toBe('Edge 131')
    expect(browserOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.86 Safari/537.36')).toBe('Chrome 131')
    expect(browserOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) VoraxOverlay/0.1.3 Chrome/130.0.6723.191 Electron/33.2.1 Safari/537.36')).toBe('Electron 33')
    expect(browserOf('Mozilla/5.0 (Windows NT 10.0; rv:132.0) Gecko/20100101 Firefox/132.0')).toBe('Firefox 132')
    expect(browserOf('something else')).toBe('other')
  })

  it('the debug part: the capture, the screen, the colours, each tank’s lines as read, and the scores of what was unsure', async () => {
    const { debugOf } = await import('@/solver/share/snapshot')
    const r: Reading = {
      ...reading,
      fields: { ...reading.fields, 'tank0.activity': { sure: false, guess: '1', score: 0.61, second: 0.58 } },
      debug: { off: 0.04, corrected: false, tanks: [{ rgb: [200, 210, 230], total: '120', aq: '5x2' }, null, null, null, null, null], ms: 412 },
    }
    const env = { dpr: 1.25, hdr: true, browser: 'Chrome 131' }
    const win = { outer: [1936, 1119] as [number, number], client: [1920, 1080] as [number, number], scale: 1.25 }
    expect(debugOf(r, ['tank0.activity'], env, win)).toEqual({
      frame: [3440, 1440], dpr: 1.25, hdr: true, browser: 'Chrome 131', ms: 412, off: 0.04, corrected: false,
      tanks: [{ rgb: [200, 210, 230], total: '120', aq: '5x2' }, null, null, null, null, null],
      scores: { 'tank0.activity': [0.61, 0.58] },
      window: win,
    })
    expect(debugOf({ ...reading, debug: undefined }, [], env, null)).toMatchObject({ frame: [3440, 1440], tanks: [] })
    expect(debugOf(reading, [], env, null)).not.toHaveProperty('window')
  })

  it('a broken read’s long lines and scores are cut to what the collector keeps', async () => {
    const { debugOf } = await import('@/solver/share/snapshot')
    const r: Reading = { ...reading, fields: { 'tank0.activity': { sure: false, score: 1.00004, second: -1.3 } }, debug: { off: 0.5, corrected: true, tanks: [{ rgb: [1, 2, 3], total: '9'.repeat(40), aq: '' }] } }
    const d = debugOf(r, ['tank0.activity'], { dpr: 1, hdr: false, browser: 'Edge 131' }, null)
    expect(d.tanks[0]!.total).toHaveLength(16)
    expect(d.scores['tank0.activity']).toEqual([1, -1])
  })

  it('a snapshot carries it', () => {
    const debug = { frame: [1920, 1080] as [number, number], dpr: 1, hdr: false, browser: 'Edge 131', off: 0, corrected: false, tanks: [], scores: {} }
    expect(toSnapshot(reading, { ...ctx, debug }).debug).toEqual(debug)
  })
})
