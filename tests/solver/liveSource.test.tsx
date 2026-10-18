import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LiveSource, type LiveDeps } from '@/solver/live/LiveSource'
import type { LiveEvent } from '@/solver/live/liveLoop'

function setup() {
  let emit: (e: LiveEvent) => void = () => {}
  let ended: () => void = () => {}
  const following = { stop: vi.fn(), snapNow: vi.fn(), cancel: vi.fn() }
  const frame = { width: 4, height: 2, data: new Uint8ClampedArray(32) } as unknown as ImageData
  const share = { grab: vi.fn(async () => frame), stop: vi.fn(), onEnded: (f: () => void) => (ended = f), size: { width: 4, height: 2 } }
  const deps: LiveDeps = {
    shareWindow: vi.fn(async () => share),
    follow: vi.fn((_h, on) => {
      emit = on
      return following
    }),
    pickLog: vi.fn(async () => ({ getFile: async () => ({ size: 0, slice: () => ({ arrayBuffer: async () => new ArrayBuffer(0) }) }) })),
  }
  const onFrame = vi.fn()
  render(<LiveSource onFrame={onFrame} deps={deps} />)
  return { deps, onFrame, share, following, emit: (e: LiveEvent) => act(() => emit(e)), end: () => act(() => ended()) }
}

async function connect() {
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Choose the file' })))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Share the game window' })))
}

it('shows the Program Files note and the three log folders with Copy buttons', () => {
  setup()
  expect(screen.getByText(/Chrome can't open files under Program Files from its file window/)).toBeTruthy()
  expect(screen.getByText(/Steam\\steamapps\\common\\Torchlight Infinite\\UE_game/)).toBeTruthy()
  expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(3)
})

it('a snap after connecting grabs a frame and hands it on', async () => {
  const t = setup()
  await connect()
  t.emit({ type: 'snap', kind: 'board', triggerAt: 0, lines: [] })
  await waitFor(() => expect(t.onFrame).toHaveBeenCalledWith(expect.objectContaining({ width: 4 }), 'board', undefined))
  expect(t.share.grab.mock.calls.length).toBeGreaterThanOrEqual(2)
})

it('returns to step 2 when sharing ends, and cancels a pending snap', async () => {
  const t = setup()
  await connect()
  t.end()
  expect(t.following.cancel).toHaveBeenCalled()
  t.emit({ type: 'snap', kind: 'board', triggerAt: 0, lines: [] })
  await act(async () => {})
  expect(t.onFrame).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Share the game window' })).toBeTruthy()
})

it('Snap now asks the follower for a manual snap', async () => {
  const t = setup()
  await connect()
  fireEvent.click(screen.getByRole('button', { name: 'Snap now' }))
  expect(t.following.snapNow).toHaveBeenCalled()
})

it('warns when the log shows no game lines 30 s after sharing', async () => {
  vi.useFakeTimers()
  try {
    const t = setup()
    await connect()
    t.emit({ type: 'status', detailSeen: false, refreshes: 0, over: false, lines: 10 })
    await act(async () => vi.advanceTimersByTime(30_000))
    expect(screen.getByText(/Enable Log looks off/)).toBeTruthy()
  } finally {
    vi.useRealTimers()
  }
})

it('capture-mode ticks from the follower grab a frame, and failures are shown', async () => {
  window.history.pushState({}, '', '/?capture')
  const folder = { name: 'f', keys: async function* () {}, getFileHandle: async () => ({ createWritable: async () => ({ write: async () => {}, close: async () => {} }) }) }
  vi.stubGlobal('showDirectoryPicker', async () => folder)
  const t = setup()
  await connect()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save frames to a folder' })))
  t.share.grab.mockRejectedValueOnce(new Error('grab failed'))
  t.emit({ type: 'tick' })
  await waitFor(() => expect(screen.getByText(/500 ms pictures: Error: grab failed/)).toBeTruthy())
  vi.unstubAllGlobals()
  window.history.pushState({}, '', '/')
})

it('capture-mode ticks grab nothing until a folder is picked', async () => {
  window.history.pushState({}, '', '/?capture')
  const t = setup()
  await connect()
  t.share.grab.mockClear()
  t.emit({ type: 'tick' })
  await act(async () => {})
  expect(t.share.grab).not.toHaveBeenCalled()
  window.history.pushState({}, '', '/')
})
