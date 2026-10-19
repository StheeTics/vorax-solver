import { act, render, screen } from '@testing-library/react'
import { LiveSource, type LiveDeps } from '@/solver/live/LiveSource'
import { TROUBLES, troubleOf } from '@/solver/live/troubles'
import type { DesktopBridge } from '@/solver/desktop/bridge'

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
    expect(screenTrouble({ filled: 5, unread: 5, notGame: 0, windowed: false })).toBe('cantRead')
    expect(screenTrouble({ filled: 4, unread: 2, notGame: 0, windowed: false })).toBe('cantRead')
    expect(screenTrouble({ filled: 4, unread: 1, notGame: 0, windowed: false })).toBeNull()
    expect(screenTrouble({ filled: 1, unread: 1, notGame: 0, windowed: false })).toBeNull()
    expect(screenTrouble({ filled: 0, unread: 0, notGame: 3, windowed: false })).toBe('cantRead')
    expect(screenTrouble({ filled: 0, unread: 0, notGame: 2, windowed: false })).toBeNull()
  })
  it('says so plainly when the app sees the game is windowed', async () => {
    const { screenTrouble } = await import('@/solver/live/troubles')
    expect(screenTrouble({ filled: 5, unread: 5, notGame: 0, windowed: true })).toBe('windowed')
    expect(TROUBLES.windowed.card).toMatch(/windowed/)
    expect(TROUBLES.windowed.steps.join(' ')).toMatch(/borderless or fullscreen/)
    expect(TROUBLES.cantRead.card).toMatch(/can’t read your game screen/)
  })
})
