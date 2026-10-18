import { fireEvent, render, screen } from '@testing-library/react'
import { BoardPanel } from '@/solver/board/BoardPanel'
import { emptyState } from '@/solver/types'
import type { ScreenState } from '@/strategy/advisor'

const withTanks = (): ScreenState => ({
  ...emptyState(),
  tanks: Array.from({ length: 6 }, () => ({ archetype: 'pest' as const, rarity: 'magic' as const, activity: 81, quantity: 340 })),
})

function setup(state = withTanks(), fields = {}) {
  const onChange = vi.fn()
  render(<BoardPanel state={state} fields={fields} onChange={onChange} shelley={6} onShelley={() => {}} />)
  return onChange
}

it('editing a tank calls onChange with the new state and the field key', () => {
  const onChange = setup()
  fireEvent.change(screen.getByLabelText('Tank 3 rarity'), { target: { value: 'boss' } })
  const [next, key] = onChange.mock.calls[0]
  expect(next.tanks[2].rarity).toBe('boss')
  expect(key).toBe('tank2.rarity')
})

it('unsure fields show a warning', () => {
  setup(withTanks(), { hand1: { sure: false, guess: 'Green Bile Solution' } })
  expect(screen.getByTitle('Unsure: best guess Green Bile Solution')).toBeTruthy()
})

it('marking a tank empty sets it to null', () => {
  const onChange = setup()
  fireEvent.click(screen.getByLabelText('Tank 1 occupied'))
  expect(onChange.mock.calls[0][0].tanks[0]).toBeNull()
  expect(onChange.mock.calls[0][1]).toBe('tank0.empty')
})

it('filling an empty tank gives it the base stats', () => {
  const onChange = setup(emptyState())
  fireEvent.click(screen.getByLabelText('Tank 1 occupied'))
  expect(onChange.mock.calls[0][0].tanks[0]).toEqual({ archetype: 'pest', rarity: 'normal', activity: 1, quantity: 36 })
})

it('choosing a hand card sets its name', () => {
  const onChange = setup()
  fireEvent.change(screen.getByLabelText('Card 1'), { target: { value: 'Green Bile Solution' } })
  expect(onChange.mock.calls[0][0].hand).toEqual(['Green Bile Solution'])
  expect(onChange.mock.calls[0][1]).toBe('hand0')
})

it('an empty board starts with the 3 potion refreshes a game begins with', () => {
  expect(emptyState().potionRefreshes).toBe(3)
})
