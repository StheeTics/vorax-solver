import { render, screen } from '@testing-library/react'
import type { Advice, ScreenState } from '@/strategy/advisor'
import { dependsOn } from '@/solver/advice/depends'
import { AdvicePanel } from '@/solver/advice/AdvicePanel'
import { overlayCard } from '@/solver/desktop/bridge'

const board: ScreenState = { tanks: [null, null, null, null, null, null], hand: ['Mutagenic Powder', 'Green Bile Solution'], instruments: ['Chrysalis Specimen'], phase: 'potion', round: 4 }
const advice = (index: number, end: number): Advice => {
  const best = { index, targets: [], value: end, end: { activity: end, reached: 0.2 } }
  return { best, ranking: [best], board: 0, plan: true, final: true, ms: 1, unknown: [] }
}

describe('advice for each instrument an unconfirmed pick could be', () => {
  it('is nothing to show when the best move is the same either way', () => {
    expect(dependsOn([{ name: 'Chrysalis Specimen', board, advice: advice(1, 500_000) }, { name: 'Hyperplastic Frontal Lobe', board, advice: advice(1, 450_000) }])).toBeNull()
  })
  it('lists each instrument’s best move when they differ', () => {
    expect(dependsOn([{ name: 'Chrysalis Specimen', board, advice: advice(1, 500_000) }, { name: 'Hyperplastic Frontal Lobe', board, advice: advice(0, 450_000) }])).toEqual([
      { name: 'Chrysalis Specimen', move: 'Play Green Bile Solution (card 2)', end: 'Ends around 500,000 · 20% rainbow' },
      { name: 'Hyperplastic Frontal Lobe', move: 'Play Mutagenic Powder (card 1)', end: 'Ends around 450,000 · 20% rainbow' },
    ])
  })
  it('is nothing to show until every option has its advice', () => {
    expect(dependsOn(null)).toBeNull()
  })

  const depends = [{ name: 'Chrysalis Specimen', move: 'Play Green Bile Solution (card 2)', end: 'Ends around 500,000 · 20% rainbow' }, { name: 'Hyperplastic Frontal Lobe', move: 'Play Mutagenic Powder (card 1)', end: '' }]
  it('the Solver says so instead of one move', () => {
    render(<AdvicePanel advice={advice(0, 450_000)} updating={false} state={board} depends={depends} />)
    const note = screen.getByRole('region', { name: 'Depends on your instrument' })
    expect(note.textContent).toContain('The best move depends on which instrument you took.')
    expect(note.textContent).toContain('With Chrysalis Specimen: Play Green Bile Solution (card 2)')
    expect(screen.queryByRole('heading', { name: 'Play Mutagenic Powder (card 1)' })).toBeNull()
  })
  it('and so does the card over the game', () => {
    const card = overlayCard({ board, advice: advice(0, 450_000) }, false, [], depends)
    expect(card.move).toBe('Depends on which instrument you took')
    expect(card.others).toEqual(['With Chrysalis Specimen: Play Green Bile Solution (card 2)', 'With Hyperplastic Frontal Lobe: Play Mutagenic Powder (card 1)'])
  })
})

describe('the advice for each option is worked out', () => {
  it('for every option, then handed back together', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useAlternatives } = await import('@/solver/advice/useAlternatives')
    const run = (s: ScreenState, emit: (a: Advice) => void) => emit(advice(s.instruments[0] === 'Chrysalis Specimen' ? 1 : 0, 400_000))
    const options = ['Chrysalis Specimen', 'Hyperplastic Frontal Lobe'].map(name => ({ name, board: { ...board, instruments: [name] } }))
    const { result } = renderHook(() => useAlternatives(options, run))
    expect(result.current?.map(a => [a.name, a.advice.best && a.advice.best !== 'refresh' ? a.advice.best.index : null])).toEqual([['Chrysalis Specimen', 1], ['Hyperplastic Frontal Lobe', 0]])
  })
  it('nothing without an open pick', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useAlternatives } = await import('@/solver/advice/useAlternatives')
    expect(renderHook(() => useAlternatives(null)).result.current).toBeNull()
  })
})
