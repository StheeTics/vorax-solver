import { act, render, screen } from '@testing-library/react'
import { bridgeLog, overlayCard, type DesktopBridge } from '@/solver/desktop/bridge'
import { LiveSource, type LiveDeps } from '@/solver/live/LiveSource'
import type { Advice, ScreenState } from '@/strategy/advisor'

function fakeBridge(size: number | null = 10) {
  let onGame: (g: { running: boolean }) => void = () => {}
  let onSnap: () => void = () => {}
  const bridge: DesktopBridge = {
    logSize: vi.fn(async () => size),
    readLog: vi.fn(async (a: number, b: number) => new Uint8Array(b - a).fill(65).buffer),
    onGame: vi.fn(cb => void (onGame = cb)),
    onSnap: vi.fn(cb => void (onSnap = cb)),
    showAdvice: vi.fn(),
  }
  return { bridge, game: (running: boolean) => act(() => onGame({ running })), snap: () => act(() => onSnap()) }
}

describe('the log, read from disk by Vorax Overlay', () => {
  it('reads the size and any slice through the app', async () => {
    const { bridge } = fakeBridge(10)
    const file = await bridgeLog(bridge).getFile()
    expect(file.size).toBe(10)
    expect(new Uint8Array(await file.slice(2, 5).arrayBuffer())).toEqual(new Uint8Array([65, 65, 65]))
    expect(bridge.readLog).toHaveBeenCalledWith(2, 5)
  })
  it('without a log yet, reading fails (the follower then waits and tries again)', async () => {
    const { bridge } = fakeBridge(null)
    await expect(bridgeLog(bridge).getFile()).rejects.toThrow()
  })
})

describe('Live mode inside Vorax Overlay', () => {
  function setup() {
    const t = fakeBridge()
    const following = { stop: vi.fn(), snapNow: vi.fn(), cancel: vi.fn() }
    const share = { grab: vi.fn(), stop: vi.fn(), onEnded: vi.fn(), size: { width: 4, height: 2 } }
    const deps: LiveDeps = { shareWindow: vi.fn(async () => share), follow: vi.fn(() => following), pickLog: vi.fn() }
    render(<LiveSource onFrame={vi.fn()} deps={deps} desktop={t.bridge} />)
    return { ...t, deps, following, share }
  }

  it('follows the game log by itself: no file to drag in', () => {
    const t = setup()
    expect(screen.queryByText(/Drag UE_game.log here/)).toBeNull()
    expect(t.deps.follow).toHaveBeenCalled()
  })

  it('shares the game window by itself while the game runs, and stops when it closes', async () => {
    const t = setup()
    expect(t.deps.shareWindow).not.toHaveBeenCalled()
    await t.game(true)
    expect(t.deps.shareWindow).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Share the game window' })).toBeNull()
    await t.game(false)
    expect(t.share.stop).toHaveBeenCalled()
  })

  it('the app’s picture hotkey takes a picture now', async () => {
    const t = setup()
    await t.game(true)
    t.snap()
    expect(t.following.snapNow).toHaveBeenCalled()
  })
})

describe('the overlay card', () => {
  const board: ScreenState = { tanks: [null, null, null, null, null, null], hand: ['Mutagenic Powder', 'Green Bile Solution'], instruments: [], phase: 'potion', round: 4 }
  const advice = (a: Partial<Advice>): Advice => ({ best: null, ranking: [], board: 0, plan: true, final: true, ms: 1, unknown: [], ...a })

  it('shows the move, the predicted end and the next choices', () => {
    const best = { index: 1, targets: [0], value: 900_000, end: { activity: 900_000, reached: 0.4 } }
    const card = overlayCard({ board, advice: advice({ best, ranking: [best, { index: 0, targets: [], value: 700_000, end: { activity: 700_000, reached: 0.1 } }] }) }, false)
    expect(card.move).toBe('Play Green Bile Solution (card 2) → tank 1')
    expect(card.detail).toBe('Ends around 900,000 · 40% rainbow')
    expect(card.others).toEqual(['Play Mutagenic Powder: 700,000 · 10% rainbow'])
    expect(card.round).toBe(4)
    expect(card.updating).toBe(false)
  })

  it('says it is working before the first answer', () => {
    expect(overlayCard(null, true).move).toBe('Working out the best move…')
  })

  it('a reroll shows its own prediction', () => {
    const card = overlayCard({ board, advice: advice({ best: 'refresh', refreshEnd: { activity: 640_000, reached: 0.12 } }) }, false)
    expect(card.move).toBe('Refresh')
    expect(card.detail).toBe('Ends around 640,000 · 12% rainbow')
  })

  it('says refresh, and passes notes through', () => {
    expect(overlayCard({ board: { ...board, phase: 'instrument' }, advice: advice({ best: 'refresh' }) }, false).move).toBe('Refresh')
    expect(overlayCard({ board, advice: advice({ note: 'A Xenopanacea: always take it when it’s offered.', best: { index: 0, targets: [], value: 0 } }) }, false).detail).toMatch(/Xenopanacea/)
  })

  it('waits for cards when there is no advice', () => {
    expect(overlayCard(null, false).move).toBe('Waiting for the cards…')
  })
})

describe('sending the advice to the overlay', () => {
  it('sends the card whenever the shown advice or its updating state changes', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useOverlay } = await import('@/solver/desktop/bridge')
    const { bridge } = fakeBridge()
    const { rerender } = renderHook(({ updating }) => useOverlay(null, updating, bridge), { initialProps: { updating: false } })
    expect(bridge.showAdvice).toHaveBeenLastCalledWith(expect.objectContaining({ move: 'Waiting for the cards…' }))
    rerender({ updating: true })
    expect(bridge.showAdvice).toHaveBeenLastCalledWith(expect.objectContaining({ move: 'Working out the best move…', updating: true }))
  })
  it('on the website (no app) it does nothing', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useOverlay } = await import('@/solver/desktop/bridge')
    expect(() => renderHook(() => useOverlay(null, false, null))).not.toThrow()
  })
})

describe('Live mode inside Vorax Overlay, told twice that the game runs', () => {
  it('shares the window once', async () => {
    const t = fakeBridge()
    let resolve: (s: unknown) => void = () => {}
    const share = { grab: vi.fn(), stop: vi.fn(), onEnded: vi.fn(), size: { width: 4, height: 2 } }
    const deps: LiveDeps = { shareWindow: vi.fn(() => new Promise(r => (resolve = r))) as LiveDeps['shareWindow'], follow: vi.fn(() => ({ stop: vi.fn(), snapNow: vi.fn(), cancel: vi.fn() })), pickLog: vi.fn() }
    render(<LiveSource onFrame={vi.fn()} deps={deps} desktop={t.bridge} />)
    await t.game(true)
    await t.game(true)
    await act(async () => resolve(share))
    expect(deps.shareWindow).toHaveBeenCalledTimes(1)
  })
})
