import { render, screen } from '@testing-library/react'
import type { advise, Advice, ScreenState } from '@/strategy/advisor'
import { runAdvice } from '@/solver/advice/runAdvice'
import { AdvicePanel } from '@/solver/advice/AdvicePanel'
import { emptyState } from '@/solver/types'

const hand = ['Mutagenic Powder', 'Green Bile Solution', 'Bewitching Tincture']
const state: ScreenState = { ...emptyState(), hand }
const advice = (best: Advice['best']): Advice => ({ best, ranking: best === 'refresh' || best === null ? [] : [best], board: 0, plan: false, final: true, ms: 1, unknown: [] })

it('runAdvice emits once for an instrument offer', () => {
  const fake = vi.fn<typeof advise>(() => advice('refresh'))
  const emit = vi.fn()
  runAdvice({ ...state, phase: 'instrument', hand: ['Contracted Claws'] }, emit, fake)
  expect(emit).toHaveBeenCalledTimes(1)
})

it('runAdvice gives potions only the look-ahead answer, no quick answer first', () => {
  const fake = vi.fn<typeof advise>(() => advice('refresh'))
  const emit = vi.fn()
  runAdvice(state, emit, fake)
  expect(emit).toHaveBeenCalledTimes(1)
  expect(fake.mock.calls[0][3]).toBe(true)
})

it('look-ahead choices show the predicted end of the run and how often it reached 950,000', () => {
  const ahead: Advice = { ...advice({ index: 0, targets: [], value: 950_000, end: { activity: 900_000, reached: 0.4 } }), plan: true }
  render(<AdvicePanel advice={ahead} updating={false} state={state} />)
  expect(screen.getByRole('list', { name: 'Choices' }).textContent).toMatch(/900,000.*40% rainbow/)
  expect(screen.getByText(/end of the run/)).toBeTruthy()
})

it('panel headline names the card and tanks', () => {
  render(<AdvicePanel advice={advice({ index: 1, targets: [4], value: 5 })} updating={false} state={state} />)
  expect(screen.getByRole('heading', { name: 'Play Green Bile Solution (card 2) → tank 5' })).toBeTruthy()
})

it('panel headline without targets names only the card', () => {
  render(<AdvicePanel advice={advice({ index: 0, targets: [], value: 5 })} updating={false} state={state} />)
  expect(screen.getByRole('heading', { name: 'Play Mutagenic Powder (card 1)' })).toBeTruthy()
})

it('panel shows Refresh', () => {
  render(<AdvicePanel advice={advice('refresh')} updating={false} state={state} />)
  expect(screen.getByRole('heading', { name: 'Refresh' })).toBeTruthy()
})

it('instrument picks say Take', () => {
  const s: ScreenState = { ...state, phase: 'instrument', hand: ['Chrysalis Specimen', 'Bone Saw'] }
  render(<AdvicePanel advice={advice({ index: 0, targets: [], value: 5 })} updating={false} state={s} />)
  expect(screen.getByRole('heading', { name: /^Take Chrysalis Specimen \(card \d\)$/ })).toBeTruthy()
})

it('while a new board is worked out, the last advice stays up, marked as updating', () => {
  render(<AdvicePanel advice={{ ...advice('refresh'), unknown: ['Foo'] }} updating={true} state={state} />)
  expect(screen.getByText('Working out the new board…')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Refresh' })).toBeTruthy()
  expect(screen.getByText(/Not recognised: Foo/)).toBeTruthy()
})

it('a reroll is advised with its prediction', () => {
  render(<AdvicePanel advice={{ ...advice('refresh'), plan: true, refreshEnd: { activity: 640_000, reached: 0.12 } }} updating={false} state={state} />)
  expect(screen.getByRole('heading', { name: 'Refresh' })).toBeTruthy()
  expect(screen.getByText('Ends around 640,000 · 12% rainbow')).toBeTruthy()
})

it('before the first answer, it says it is working rather than asking for cards', () => {
  render(<AdvicePanel advice={null} updating={true} state={state} />)
  expect(screen.getByText('Working out the best move…')).toBeTruthy()
})

it('with no cards on offer it asks for the board instead of advising', () => {
  render(<AdvicePanel advice={advice('refresh')} updating={false} state={{ ...state, hand: [] }} />)
  expect(screen.queryByRole('heading', { name: 'Refresh' })).toBeNull()
  expect(screen.getByText('Set the cards on offer to get advice.')).toBeTruthy()
})

it('says protocols do not change the score', () => {
  const s: ScreenState = { ...state, phase: 'protocol', hand: ['Laser Amputation'] }
  render(<AdvicePanel advice={{ ...advice('refresh'), ranking: [] }} updating={false} state={s} />)
  expect(screen.getByText(/Surgical Protocols don't change Ultimate Activity/)).toBeTruthy()
})

it('advice for an older board is only ever shown with that board, never paired with a newer one', async () => {
  const { renderHook, act: hookAct } = await import('@testing-library/react')
  const { useAdvice } = await import('@/solver/advice/useAdvice')
  vi.useFakeTimers()
  try {
    const first: ScreenState = { ...state, hand: ['Mutagenic Powder'] }
    const { result, rerender } = renderHook(({ s }) => useAdvice(s), { initialProps: { s: first } })
    await hookAct(async () => vi.advanceTimersByTime(200))
    expect(result.current.shown?.board).toBe(first)
    rerender({ s: { ...state, hand: ['Green Bile Solution'] } })
    expect(result.current.shown?.board).toBe(first)
  } finally {
    vi.useRealTimers()
  }
})

describe('an instrument whose panel icon hasn’t been seen yet', () => {
  const offer: ScreenState = { ...emptyState(), phase: 'instrument', hand: ['Nettle Toggle', 'Rawhide Restraint', 'Clustered Eggs'] }
  const ranked: Advice = { best: { index: 1, targets: [], value: 30 }, ranking: [1, 0, 2].map((index, i) => ({ index, targets: [], value: 30 - i })), board: 0, plan: false, final: true, ms: 1, unknown: [] }
  it('is marked in the list of choices, saying that picking it teaches the Solver', () => {
    render(<AdvicePanel advice={ranked} updating={false} state={offer} iconsKnown={['Rawhide Restraint']} />)
    const items = [...screen.getByRole('list', { name: 'Choices' }).querySelectorAll(':scope > li')].map(li => li.textContent)
    expect(items[0]).toMatch(/^Take Rawhide Restraint/)
    expect(items[0]).not.toMatch(/teaches/)
    expect(items[1]).toMatch(/Take Nettle Toggle.*Unknown icon: picking it teaches the Solver/)
    expect(items[2]).toMatch(/Take Clustered Eggs.*Unknown icon: picking it teaches the Solver/)
  })
  it('isn’t marked once its icon is known, or when the known icons aren’t', () => {
    const { unmount } = render(<AdvicePanel advice={ranked} updating={false} state={offer} iconsKnown={offer.hand} />)
    expect(screen.queryByText(/teaches the Solver/)).toBeNull()
    unmount()
    render(<AdvicePanel advice={ranked} updating={false} state={offer} />)
    expect(screen.queryByText(/teaches the Solver/)).toBeNull()
  })
})

it('shows only the top 3 choices', () => {
  const hand = ['Mutagenic Powder', 'Green Bile Solution', 'Bewitching Tincture', 'Xeno-Hormone', 'Eggshell Powder']
  const many: Advice = { best: { index: 0, targets: [], value: 9 }, ranking: hand.map((_, i) => ({ index: i, targets: [], value: 9 - i })), board: 0, plan: false, final: true, ms: 1, unknown: [] }
  render(<AdvicePanel advice={many} updating={false} state={{ ...emptyState(), hand }} />)
  expect([...screen.getByRole('list', { name: 'Choices' }).querySelectorAll(':scope > li')].map(li => li.textContent)).toEqual(['Play Mutagenic Powder9', 'Play Green Bile Solution8', 'Play Bewitching Tincture7'])
})

describe('the pick, shown as the hand', () => {
  const hand = ['Mutagenic Powder', 'Green Bile Solution', 'Bewitching Tincture']
  const best: Advice = { best: { index: 1, targets: [1, 3], value: 50 }, ranking: [{ index: 1, targets: [1, 3], value: 50 }], board: 0, plan: false, final: true, ms: 1, unknown: [] }
  const board: ScreenState = { ...emptyState(), hand, tanks: [null, { archetype: 'pest', rarity: 'normal', activity: 1, quantity: 36 }, null, { archetype: 'agito', rarity: 'magic', activity: 5, quantity: 24 }, null, null] }

  it('names the card’s place in the headline', () => {
    render(<AdvicePanel advice={best} updating={false} state={board} />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Play Green Bile Solution (card 2) → tank 2, 4')
  })
  it('draws the cards in game order with the one to pick marked', () => {
    render(<AdvicePanel advice={best} updating={false} state={board} />)
    const cards = screen.getByRole('list', { name: 'Cards on offer' }).querySelectorAll('li')
    expect([...cards].map(c => c.getAttribute('aria-label'))).toEqual(['Card 1: Mutagenic Powder', 'Card 2: Green Bile Solution, pick this', 'Card 3: Bewitching Tincture'])
    expect(cards[1].getAttribute('aria-current')).toBe('true')
  })
  it('draws the six tanks with the targets marked', () => {
    render(<AdvicePanel advice={best} updating={false} state={board} />)
    const tanks = screen.getByRole('list', { name: 'Tanks' }).querySelectorAll('li')
    expect([...tanks].map(t => t.getAttribute('aria-current'))).toEqual([null, 'true', null, 'true', null, null])
  })
  it('shows the hand for a refresh too, with no card marked', () => {
    render(<AdvicePanel advice={advice('refresh')} updating={false} state={board} />)
    const cards = screen.getByRole('list', { name: 'Cards on offer' }).querySelectorAll('li')
    expect(cards).toHaveLength(3)
    expect([...cards].some(c => c.getAttribute('aria-current'))).toBe(false)
  })
  it('describes each tank by what is in it, so the board can be matched to the game', () => {
    render(<AdvicePanel advice={best} updating={false} state={board} />)
    const tanks = [...screen.getByRole('list', { name: 'Tanks' }).querySelectorAll('li')].map(t => t.getAttribute('aria-label'))
    expect(tanks).toEqual(['Tank 1: empty', 'Tank 2: Pest, normal, 1 × 36, target', 'Tank 3: empty', 'Tank 4: Agito, magic, 5 × 24, target', 'Tank 5: empty', 'Tank 6: empty'])
  })
  it('draws the tanks only for a potion pick: an instrument or protocol pick has no tank to choose', () => {
    render(<AdvicePanel advice={best} updating={false} state={{ ...board, phase: 'instrument', hand: ['Sinew Garrote', 'Fouled Scraper', 'Nettle Toggle'] }} />)
    expect(screen.queryByRole('list', { name: 'Tanks' })).toBeNull()
    expect(screen.getByRole('list', { name: 'Cards on offer' })).toBeTruthy()
  })
})
