import { act, render, screen } from '@testing-library/react'
import { LiveSource, type LiveDeps } from '@/solver/live/LiveSource'
import { TROUBLES, troubleOf } from '@/solver/live/troubles'
import type { DesktopBridge } from '@/solver/desktop/bridge'
import { emptyState } from '@/solver/types'

it('names why the game window couldn’t be shared, from the error', () => {
  expect(troubleOf(new DOMException('Could not start video source', 'NotReadableError'))).toBe('windowBlocked')
  expect(troubleOf(new DOMException('Permission denied', 'NotAllowedError'))).toBe('noWindow')
  expect(troubleOf(new Error('something else'))).toBe('windowBlocked')
})

it('each trouble has a line for the card and the steps to fix it', () => {
  expect(TROUBLES.logOff.card).toMatch(/log is off/)
  expect(TROUBLES.logOff.steps.join(' ')).toMatch(/Enable Log/)
  expect(TROUBLES.windowBlocked.card).toMatch(/Windows won’t let Vorax Overlay see the game window/)
  expect(TROUBLES.windowBlocked.steps.join(' ')).toMatch(/administrator/)
  expect(TROUBLES.windowBlocked.steps.join(' ')).toMatch(/High performance/)
  expect(TROUBLES.windowBlocked.steps.join(' ')).toMatch(/Media Feature Pack/)
  expect(TROUBLES.noWindow.card).toMatch(/can’t find the game window/)
})

describe('inside Vorax Overlay, when the game window can’t be shared', () => {
  function app(shareWindow: LiveDeps['shareWindow']) {
    let game: (g: { running: boolean }) => void = () => {}
    const desktop: DesktopBridge = { logSize: async () => 0, readLog: async () => new ArrayBuffer(0), onGame: cb => void (game = cb), onSnap: () => {}, showAdvice: () => {} }
    const deps: LiveDeps = { shareWindow, follow: vi.fn(() => ({ stop: vi.fn(), snapNow: vi.fn(), cancel: vi.fn() })), pickLog: vi.fn() }
    const onTrouble = vi.fn()
    render(<LiveSource onFrame={vi.fn()} deps={deps} desktop={desktop} onTrouble={onTrouble} />)
    return { onTrouble, start: () => act(async () => game({ running: true })) }
  }

  it('says why and what to check, and tells the page for the card', async () => {
    const t = app(vi.fn(async () => { throw new DOMException('Could not start video source', 'NotReadableError') }))
    await t.start()
    expect(screen.getByText(TROUBLES.windowBlocked.card)).toBeTruthy()
    for (const step of TROUBLES.windowBlocked.steps) expect(screen.getByText(step)).toBeTruthy()
    expect(t.onTrouble).toHaveBeenLastCalledWith('windowBlocked')
  })

  it('tries again by itself, and clears the trouble once the window is shared', async () => {
    vi.useFakeTimers()
    try {
      const share = { grab: vi.fn(), stop: vi.fn(), onEnded: vi.fn(), size: { width: 1, height: 1 } }
      const shareWindow = vi.fn().mockRejectedValueOnce(new DOMException('', 'NotAllowedError')).mockResolvedValue(share)
      const t = app(shareWindow)
      await t.start()
      expect(t.onTrouble).toHaveBeenLastCalledWith('noWindow')
      await act(async () => vi.advanceTimersByTime(15_000))
      expect(shareWindow).toHaveBeenCalledTimes(2)
      expect(t.onTrouble).toHaveBeenLastCalledWith(null)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('a screen the Solver can’t read', () => {
  it('is raised when most tanks’ numbers can’t be read, or several pictures in a row aren’t the game screen', async () => {
    const { screenTrouble } = await import('@/solver/live/troubles')
    expect(screenTrouble({ filled: 5, unread: 5, notGame: 0 })).toBe('cantRead')
    expect(screenTrouble({ filled: 4, unread: 2, notGame: 0 })).toBe('cantRead')
    expect(screenTrouble({ filled: 4, unread: 1, notGame: 0 })).toBeNull()
    expect(screenTrouble({ filled: 1, unread: 1, notGame: 0 })).toBeNull()
    expect(screenTrouble({ filled: 0, unread: 0, notGame: 3 })).toBe('cantRead')
    expect(screenTrouble({ filled: 0, unread: 0, notGame: 2 })).toBeNull()
  })
  it('doesn’t blame a windowed game: it reads as well as a borderless one', () => {
    expect(TROUBLES.cantRead.card).toMatch(/can’t read your game screen/)
    expect(TROUBLES.cantRead.steps).toEqual(['Try a different resolution: most are supported, but yours might be an outlier.', 'Try a different Settings → Screen Scaling: most are supported, but yours might be an outlier.'])
    // the player's own interface scale isn't theirs to fix: only Screen Scaling is suggested
    expect(TROUBLES.cantRead.steps.join(' ')).not.toMatch(/interface scale/)
    expect(Object.values(TROUBLES).flatMap(t => [t.card, ...t.steps]).join(' ')).not.toMatch(/not windowed|is windowed/)
  })
})

describe('the game closing after its last pick', () => {
  const pest = { archetype: 'pest' as const, rarity: 'normal' as const, activity: 1, quantity: 1 }
  /** a picture with these tanks, the ones listed read unsure */
  const reading = (tanks: number, unsure: number[], notFound = false) => ({
    state: { ...emptyState(), tanks: Array.from({ length: 6 }, (_, i) => (i < tanks ? pest : null)) },
    fields: Object.fromEntries(unsure.flatMap(i => [[`tank${i}.activity`, { sure: false }], [`tank${i}.quantity`, { sure: false }]])),
    problems: notFound ? [{ kind: 'notFound' as const }] : [],
  })
  const last13 = { round: 13, phase: 'protocol' }

  it('is a picture after round 13’s protocol pick that doesn’t read as a board', async () => {
    const { gameClosing } = await import('@/solver/live/troubles')
    expect(gameClosing(last13, reading(5, [0, 1, 2, 3, 4]), 'board')).toBe(true)
    expect(gameClosing(last13, reading(0, [], true), 'board')).toBe(true)
  })
  it('isn’t a board that reads, an earlier round, or a new game’s screen', async () => {
    const { gameClosing } = await import('@/solver/live/troubles')
    expect(gameClosing(last13, reading(5, [2]), 'board')).toBe(false)
    expect(gameClosing({ round: 12, phase: 'protocol' }, reading(5, [0, 1, 2, 3, 4]), 'board')).toBe(false)
    expect(gameClosing({ round: 13, phase: 'potion' }, reading(5, [0, 1, 2, 3, 4]), 'board')).toBe(false)
    expect(gameClosing(last13, reading(5, [0, 1, 2, 3, 4]), 'screen')).toBe(false)
  })
})
