import { act, renderHook } from '@testing-library/react'
import type { Advice, ScreenState } from '@/strategy/advisor'

const pending: { state: ScreenState; emit: (a: Advice) => void }[] = []
vi.mock('@/solver/advice/runAdvice', () => ({ runAdvice: (state: ScreenState, emit: (a: Advice) => void) => void pending.push({ state, emit }) }))
const { useAdvice } = await import('@/solver/advice/useAdvice')

const board = (round: number, hand = ['Mutagenic Powder']): ScreenState => ({ tanks: [null, null, null, null, null, null], hand, instruments: [], phase: 'potion', round })
const advice = (value: number): Advice => ({ best: { index: 0, targets: [], value }, ranking: [], board: 0, plan: true, final: true, ms: 1, unknown: [] })

beforeEach(() => { vi.useFakeTimers(); pending.length = 0 })
afterEach(() => vi.useRealTimers())

it('keeps the last advice, with the board it was for, until the new board’s advice is ready', () => {
  const a = board(1), b = board(2)
  const { result, rerender } = renderHook(({ s }) => useAdvice(s), { initialProps: { s: a } })
  act(() => void vi.advanceTimersByTime(200))
  act(() => pending[0].emit(advice(1)))
  expect(result.current.shown?.board).toBe(a)

  rerender({ s: b })
  act(() => void vi.advanceTimersByTime(200))
  expect(result.current.shown?.board).toBe(a)
  expect(result.current.updating).toBe(true)

  act(() => pending[1].emit(advice(2)))
  expect(result.current.shown?.board).toBe(b)
  expect(result.current.shown?.advice.best).toMatchObject({ value: 2 })
  expect(result.current.updating).toBe(false)
})

it('a board with no cards on offer (between rounds) leaves the last advice up and asks for none', () => {
  const a = board(1)
  const { result, rerender } = renderHook(({ s }) => useAdvice(s), { initialProps: { s: a } })
  act(() => void vi.advanceTimersByTime(200))
  act(() => pending[0].emit(advice(1)))
  rerender({ s: board(2, []) })
  act(() => void vi.advanceTimersByTime(200))
  expect(pending).toHaveLength(1)
  expect(result.current.shown?.board).toBe(a)
  expect(result.current.updating).toBe(false)
})

it('a board read off the screen is advised at once; one edited by hand waits for the next keystroke', () => {
  const { rerender } = renderHook(({ s, read }) => useAdvice(s, read), { initialProps: { s: board(1), read: true } })
  act(() => void vi.advanceTimersByTime(0))
  expect(pending).toHaveLength(1)
  rerender({ s: board(2), read: false })
  act(() => void vi.advanceTimersByTime(100))
  expect(pending).toHaveLength(1)
  act(() => void vi.advanceTimersByTime(60))
  expect(pending).toHaveLength(2)
})

it('is out of date from the render the new board arrives in, before its timer has run', () => {
  const a = board(1), b = board(2)
  const { result, rerender } = renderHook(({ s }) => useAdvice(s, true), { initialProps: { s: a } })
  act(() => void vi.advanceTimersByTime(0))
  act(() => pending[0].emit(advice(1)))
  expect(result.current.updating).toBe(false)
  rerender({ s: b })
  expect(result.current.updating).toBe(true)
})
