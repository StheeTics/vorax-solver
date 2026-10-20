import { act, render, screen } from '@testing-library/react'
import { overlayCard } from '@/solver/desktop/bridge'
import { pausesOf, stillPaused } from '@/solver/advice/paused'
import { PausedPanel, UnreliableNote } from '@/solver/advice/PausedPanel'
import { SolverApp } from '@/solver/SolverApp'

describe('what pauses the Solver', () => {
  it('the log off, a screen it can’t read, and no Shelley level; not a window it can’t see (no picture, no advice)', () => {
    expect(pausesOf(['logOff', 'cantRead'], true)).toEqual(['logOff', 'cantRead', 'shelley'])
    expect(pausesOf(['windowed'], false)).toEqual(['windowed'])
    expect(pausesOf(['noWindow', 'windowBlocked'], false)).toEqual([])
  })

  it('a reason the player overrode stops pausing it; a new one pauses it again', () => {
    expect(stillPaused(['shelley'], ['shelley'])).toEqual([])
    expect(stillPaused(['shelley', 'logOff'], ['shelley'])).toEqual(['logOff'])
  })
})

describe('the card over the game', () => {
  it('paused, it says what to fix in place of the move, and offers the advice anyway', () => {
    const card = overlayCard(null, false, ['Which Intern Shelley level do you have?'], null, [], { paused: ['logOff', 'shelley'], forced: [] })
    expect(card).toMatchObject({ paused: true, move: 'Enable your Log', others: ['Pick your Shelley level'], warning: '' })
    expect(card.detail).toMatch(/log is off/)
  })

  it('shown anyway, it warns the advice is unreliable', () => {
    const card = overlayCard(null, false, [], null, [], { paused: [], forced: ['shelley'] })
    expect(card.paused).toBe(false)
    expect(card.warning).toBe('Unreliable: pick your shelley level.')
    expect(card.move).toBe('Waiting for the cards…')
  })

  it('with nothing wrong, no pause and no warning', () => {
    expect(overlayCard(null, false)).toMatchObject({ paused: false, warning: '' })
  })
})

describe('in the Solver', () => {
  beforeEach(() => localStorage.clear())

  it('the panel lists each reason with its fix, and the button says it won’t be reliable', () => {
    const force = vi.fn()
    render(<PausedPanel pauses={['logOff', 'shelley']} onForce={force} />)
    expect(screen.getByRole('heading', { name: 'Solver paused' })).toBeTruthy()
    expect(screen.getByText('Enable your Log.')).toBeTruthy()
    expect(screen.getByText('Pick your Shelley level.')).toBeTruthy()
    expect(screen.getByText(/Not reliable/)).toBeTruthy()
    screen.getByRole('button', { name: 'Show advice anyway' }).click()
    expect(force).toHaveBeenCalled()
  })

  it('the unreliable note can pause it again', () => {
    const pause = vi.fn()
    render(<UnreliableNote pauses={['shelley']} onPause={pause} />)
    expect(screen.getByRole('alert').textContent).toMatch(/^Unreliable advice\./)
    screen.getByRole('button', { name: 'Pause it again' }).click()
    expect(pause).toHaveBeenCalled()
  })

  it('a new player, with no Shelley level, sees it paused; Show advice anyway brings the advice back, marked unreliable; picking the level clears it', () => {
    render(<SolverApp />)
    expect(screen.getByRole('heading', { name: 'Solver paused' })).toBeTruthy()
    act(() => screen.getByRole('button', { name: 'Show advice anyway' }).click())
    expect(screen.queryByRole('heading', { name: 'Solver paused' })).toBeNull()
    expect(screen.getByRole('alert').textContent).toMatch(/Unreliable advice/)
    act(() => screen.getAllByRole('radio')[0].click())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Solver paused' })).toBeNull()
  })
})
