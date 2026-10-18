import { render, screen } from '@testing-library/react'
import type { advise, Advice, ScreenState } from '@/strategy/advisor'
import { runAdvice } from '@/solver/advice/runAdvice'
import { AdvicePanel } from '@/solver/advice/AdvicePanel'
import { emptyState } from '@/solver/types'

const hand = ['Mutagenic Powder', 'Green Bile Solution', 'Bewitching Tincture']
const state: ScreenState = { ...emptyState(), hand }
const advice = (best: Advice['best']): Advice => ({ best, ranking: best === 'refresh' || best === null ? [] : [best], board: 0, plan: false, final: true, ms: 1, unknown: [] })

it('runAdvice emits once without Chrysalis', () => {
  const fake = vi.fn<typeof advise>(() => advice('refresh'))
  const emit = vi.fn()
  runAdvice(state, emit, fake)
  expect(emit).toHaveBeenCalledTimes(1)
  expect(fake).toHaveBeenCalledTimes(1)
})

it('runAdvice emits quick then planning with Chrysalis Specimen', () => {
  const fake = vi.fn<typeof advise>(() => advice('refresh'))
  const emit = vi.fn()
  runAdvice({ ...state, instruments: ['Chrysalis Specimen'] }, emit, fake)
  expect(emit).toHaveBeenCalledTimes(2)
  expect(fake.mock.calls[1][3]).toBe(true)
})

it('panel headline names the card and tanks', () => {
  render(<AdvicePanel advice={advice({ index: 1, targets: [4], value: 5 })} refining={false} state={state} />)
  expect(screen.getByRole('heading', { name: 'Play Green Bile Solution → tank 5' })).toBeTruthy()
})

it('panel headline without targets names only the card', () => {
  render(<AdvicePanel advice={advice({ index: 0, targets: [], value: 5 })} refining={false} state={state} />)
  expect(screen.getByRole('heading', { name: 'Play Mutagenic Powder' })).toBeTruthy()
})

it('panel shows Refresh', () => {
  render(<AdvicePanel advice={advice('refresh')} refining={false} state={state} />)
  expect(screen.getByRole('heading', { name: 'Refresh' })).toBeTruthy()
})

it('instrument picks say Take', () => {
  const s: ScreenState = { ...state, phase: 'instrument', hand: ['Chrysalis Specimen', 'Bone Saw'] }
  render(<AdvicePanel advice={advice({ index: 0, targets: [], value: 5 })} refining={false} state={s} />)
  expect(screen.getByRole('heading', { name: 'Take Chrysalis Specimen' })).toBeTruthy()
})

it('shows refining and unrecognised names', () => {
  render(<AdvicePanel advice={{ ...advice('refresh'), unknown: ['Foo'] }} refining={true} state={state} />)
  expect(screen.getByText('Quick answer, refining…')).toBeTruthy()
  expect(screen.getByText('Not recognised: Foo')).toBeTruthy()
})

it('with no cards on offer it asks for the board instead of advising', () => {
  render(<AdvicePanel advice={advice('refresh')} refining={false} state={{ ...state, hand: [] }} />)
  expect(screen.queryByRole('heading', { name: 'Refresh' })).toBeNull()
  expect(screen.getByText('Set the cards on offer to get advice.')).toBeTruthy()
})

it('says protocols do not change the score', () => {
  const s: ScreenState = { ...state, phase: 'protocol', hand: ['Laser Amputation'] }
  render(<AdvicePanel advice={{ ...advice('refresh'), ranking: [] }} refining={false} state={s} />)
  expect(screen.getByText(/Surgical Protocols don't change Ultimate Activity/)).toBeTruthy()
})

it('advice for an older board is never shown for a newer one', async () => {
  const { renderHook, act: hookAct } = await import('@testing-library/react')
  const { useAdvice } = await import('@/solver/advice/useAdvice')
  vi.useFakeTimers()
  try {
    const first: ScreenState = { ...state, hand: ['Mutagenic Powder'] }
    const { result, rerender } = renderHook(({ s }) => useAdvice(s), { initialProps: { s: first } })
    await hookAct(async () => vi.advanceTimersByTime(200))
    expect(result.current.advice).not.toBeNull()
    rerender({ s: { ...state, hand: ['Green Bile Solution'] } })
    expect(result.current.advice).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

describe('the learning note on an instrument offer', () => {
  const offer: ScreenState = { ...emptyState(), phase: 'instrument', hand: ['Nettle Toggle', 'Rawhide Restraint', 'Clustered Eggs'] }
  it('names the offered instruments whose panel icon hasn’t been seen yet', () => {
    render(<AdvicePanel advice={advice('refresh')} refining={false} state={offer} iconsKnown={['Rawhide Restraint']} />)
    expect(screen.getByText(/picking Nettle Toggle or Clustered Eggs teaches the Solver its icon/)).toBeTruthy()
  })
  it('stays away once every offered icon is known, and when the known icons aren’t', () => {
    const { unmount } = render(<AdvicePanel advice={advice('refresh')} refining={false} state={offer} iconsKnown={offer.hand} />)
    expect(screen.queryByText(/teaches the Solver/)).toBeNull()
    unmount()
    render(<AdvicePanel advice={advice('refresh')} refining={false} state={offer} />)
    expect(screen.queryByText(/teaches the Solver/)).toBeNull()
  })
})
