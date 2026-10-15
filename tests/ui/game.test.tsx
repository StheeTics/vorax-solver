import { render, screen, fireEvent, within } from '@testing-library/react'
import { GameScreen } from '@/ui/game/GameScreen'
import { createGame, DEFAULT_SETTINGS } from '@/engine/game'
import { board, m } from '../helpers'

function start() {
  const s = createGame(DEFAULT_SETTINGS, {
    tanks: board(m('pest', 'normal'), m('agito', 'normal')),
    instruments: [{ id: 1, acquiredRound: 1 }],
    startRound: 1,
    thresholdsUsed: { t8000: false, t28000: false },
    forcedHand: [12, 7, 23],
    seed: 3,
  })
  const onEnd = vi.fn()
  render(<GameScreen initial={s} sandbox onExit={() => {}} onEnd={onEnd} />)
  return { onEnd }
}
const tank = (i: number) => screen.getByTestId(`tank-${i}`).querySelector('[data-highlight]')?.getAttribute('data-highlight') ?? null
const confirmBtn = () => screen.getByRole('button', { name: /confirm/i }) as HTMLButtonElement

it('targeted card highlights tanks; confirm needs a target; switching cards clears it', () => {
  start()
  fireEvent.click(screen.getByTestId('card-0'))
  expect(tank(0)).toBe('selectable')
  expect(tank(1)).toBe('selectable')
  expect(tank(2)).toBeNull()
  expect(confirmBtn().disabled).toBe(true)
  expect(screen.getByText('Select 1 target tank')).toBeTruthy()

  fireEvent.click(screen.getByTestId('tank-0'))
  expect(tank(0)).toBe('selected')
  expect(confirmBtn().disabled).toBe(false)

  fireEvent.click(screen.getByTestId('card-1'))
  expect(tank(0)).toBeNull()
  expect(confirmBtn().disabled).toBe(false)
  expect(screen.getByTestId('card-1').getAttribute('data-selected')).toBe('true')
})

it('confirming advances the round in the status panel', () => {
  start()
  expect(screen.getByTestId('round').textContent).toBe('1/13')
  fireEvent.click(screen.getByTestId('card-1'))
  fireEvent.click(confirmBtn())
  expect(screen.getByTestId('round').textContent).toBe('2/13')
})

it('card footers show the potion rarity', () => {
  start()
  expect(within(screen.getByTestId('card-0')).getByText('Magic Potion')).toBeTruthy()
  expect(within(screen.getByTestId('card-2')).getByText('Normal Potion')).toBeTruthy()
})

it('shows the sandbox badge and the refresh count', () => {
  start()
  expect(screen.getByText('Sandbox')).toBeTruthy()
  expect(screen.getByRole('button', { name: /refresh/i }).textContent).toContain('3')
})

it('rounds 11–13 show an End Round button that steps through to the end', () => {
  const s = createGame(DEFAULT_SETTINGS, {
    tanks: board(m('pest', 'normal')), instruments: [{ id: 1, acquiredRound: 1 }], startRound: 11,
    thresholdsUsed: { t8000: false, t28000: false }, forcedHand: [], seed: 3,
  })
  render(<GameScreen initial={s} sandbox onExit={() => {}} onEnd={() => {}} />)
  expect(screen.getByText(/no potions this round/i)).toBeTruthy()
  expect(screen.queryByTestId('card-0')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'End Round' }))
  expect(screen.getByTestId('round').textContent).toBe('12/13')
})

it('tank labels color the rarity word by rarity and the archetype word by archetype', () => {
  start()
  const label = screen.getByTestId('tank-0')
  const rarity = label.querySelector('[data-rarity-word="normal"]')
  const arch = label.querySelector('[data-archetype-word="pest"]') as HTMLElement | null
  expect(rarity?.textContent).toBe('Normal')
  expect(arch?.textContent).toBe('Pest')
  expect(arch?.style.color).toBe('rgb(176, 124, 255)') // Pest purple
  expect(screen.getByTestId('tank-1').querySelector('[data-archetype-word="agito"]')?.textContent).toBe('Agito')
  expect(screen.getByTestId('card-2').querySelector('[data-archetype-word="pest"]')?.textContent).toBe('Pest')
})

it('clicking a keyword on a card opens its tooltip without selecting the card', () => {
  start()
  fireEvent.click(within(screen.getByTestId('card-0')).getByRole('button', { name: 'mutate' }))
  expect(screen.getByRole('tooltip').textContent).toMatch(/keeps its Activity and Quantity/i)
  expect(screen.getByTestId('card-0').getAttribute('data-selected')).toBe('false')
})

it('status panel shows six reward vials', () => {
  start()
  const vials = screen.getByTestId('vials').querySelectorAll('[data-tier]')
  expect([...vials].map(v => v.getAttribute('data-tier'))).toEqual(['white', 'white', 'white', 'white', 'white', 'white'])
})

it('Next Rewards shows the next vial breakpoint and its color', () => {
  start()
  expect(screen.getByTestId('next-reward').textContent).toContain('38,000')
  expect(screen.getByTestId('next-reward').querySelector('[data-tier]')?.getAttribute('data-tier')).toBe('purple')
})
