import { act, render, screen, within } from '@testing-library/react'
import { SolverApp } from '@/solver/SolverApp'
import { HOME_URL, SUPPORT_URL } from '@/ui/links'

it('has a home link, the privacy panel and the attribution', () => {
  render(<SolverApp />)
  expect(screen.getByRole('link', { name: /home/i }).getAttribute('href')).toBe(HOME_URL)
  expect(screen.getByText('What can this see?')).toBeTruthy()
  expect(screen.getByText('Never clicks or types for you.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Tartarus Simulator' })).toBeTruthy()
})

it('where Live can’t run, it says so and points to the Windows app', () => {
  render(<SolverApp />)
  expect(screen.getByText(/Live needs Chrome or Edge on a PC/)).toBeTruthy()
  expect(screen.getAllByRole('link', { name: /Windows App/ }).length).toBeGreaterThan(0)
})

it('there is only Live: no Screenshot or Manual mode to choose', () => {
  render(<SolverApp />)
  expect(screen.queryByRole('radiogroup', { name: 'Where the board comes from' })).toBeNull()
  expect(screen.queryByText('Screenshot')).toBeNull()
})

it('has no update note', () => {
  render(<SolverApp />)
  expect(screen.queryByRole('note', { name: 'Solver updated' })).toBeNull()
  expect(screen.queryByRole('note', { name: 'Work in progress' })).toBeNull()
})


describe('the Buy me a coffee button', () => {
  const coffee = () => screen.queryByRole('link', { name: /Buy me a coffee/ })

  it('is a link that opens in a new tab', () => {
    render(<SolverApp />)
    expect(coffee()?.getAttribute('href')).toBe(SUPPORT_URL)
    expect(coffee()?.getAttribute('target')).toBe('_blank')
  })

  it('is not on the app’s Solver page: the app offers it on the card', () => {
    const w = window as unknown as { VoraxDesktop?: unknown }
    w.VoraxDesktop = { logSize: async () => null, readLog: async () => new ArrayBuffer(0), onGame: () => {}, onSnap: () => {}, showAdvice: () => {} }
    try {
      render(<SolverApp />)
      expect(coffee()).toBeNull()
    } finally {
      delete w.VoraxDesktop
    }
  })
})

it('puts the advice first and the board to correct below it', () => {
  render(<SolverApp />)
  const advice = screen.getByRole('region', { name: 'Advice' })
  const board = screen.getByLabelText('Round')
  expect(advice.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.getByRole('heading', { name: /Board state/ })).toBeTruthy()
})

it('links the Windows app from the Solver, but not inside the app', () => {
  const { unmount } = render(<SolverApp />)
  expect(screen.getByRole('link', { name: /Windows App \(Best Experience\)/ })).toBeTruthy()
  unmount()
  const w = window as unknown as { VoraxDesktop?: unknown }
  w.VoraxDesktop = { logSize: async () => null, readLog: async () => new ArrayBuffer(0), onGame: () => {}, onSnap: () => {}, showAdvice: () => {} }
  try {
    render(<SolverApp />)
    expect(screen.queryByRole('link', { name: /Windows App \(Best Experience\)/ })).toBeNull()
  } finally {
    delete w.VoraxDesktop
  }
})


it('a board link opens the Solver on that board (the demo)', async () => {
  window.history.pushState({}, '', '/solver.html?demo')
  try {
    render(<SolverApp />)
    expect(screen.getByRole('note', { name: 'Demo board' }).textContent).toMatch(/change anything/i)
    expect((screen.getAllByRole('combobox').find(s => (s as HTMLSelectElement).value === 'Mutagenic Powder'))).toBeTruthy()
  } finally {
    window.history.pushState({}, '', '/')
  }
})

it('?demo=pick shows the “Which instrument did you pick?” question; answering fills the board and teaches nothing', async () => {
  const { fireEvent } = await import('@testing-library/react')
  window.history.pushState({}, '', '/solver.html?demo=pick')
  const fetch = vi.spyOn(globalThis, 'fetch')
  try {
    render(<SolverApp />)
    const ask = screen.getByRole('group', { name: 'Which instrument did you pick?' })
    fireEvent.click(within(ask).getByRole('button', { name: 'Two-Inch Skull Nail' }))
    await screen.findByDisplayValue('Two-Inch Skull Nail')
    expect(screen.queryByRole('group', { name: 'Which instrument did you pick?' })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  } finally {
    fetch.mockRestore()
    window.history.pushState({}, '', '/')
  }
})

it('in the app, the instrument question is answered from the card over the game', async () => {
  window.history.pushState({}, '', '/solver.html?demo=pick')
  let choose: (name: string) => void = () => {}
  const cards: { choices?: string[] }[] = []
  ;(window as unknown as { VoraxDesktop?: unknown }).VoraxDesktop = {
    logSize: async () => null, readLog: async () => new ArrayBuffer(0), onGame: () => {}, onSnap: () => {}, showAdvice: (c: { choices?: string[] }) => cards.push(c),
    onChoose: (cb: (n: string) => void) => (choose = cb),
  }
  try {
    render(<SolverApp />)
    expect(cards.at(-1)!.choices).toEqual(['Two-Inch Skull Nail', 'Sinew Garrote', 'Nettle Toggle'])
    await act(async () => choose('Two-Inch Skull Nail'))
    await screen.findByDisplayValue('Two-Inch Skull Nail')
    expect(screen.queryByRole('group', { name: 'Which instrument did you pick?' })).toBeNull()
    expect(cards.at(-1)!.choices).toEqual([])
  } finally {
    delete (window as unknown as { VoraxDesktop?: unknown }).VoraxDesktop
    window.history.pushState({}, '', '/')
  }
})

describe('the Intern Shelley level is asked for until the player picks it', () => {
  beforeEach(() => localStorage.clear())

  it('a new player is asked first, and picking a level saves it and closes the question', () => {
    render(<SolverApp />)
    const ask = screen.getByRole('region', { name: 'Your Intern Shelley level' })
    expect(within(ask).getByText(/Which Intern Shelley level do you have\?/)).toBeTruthy()
    within(ask).getByRole('radio', { name: '4' }).click()
    return Promise.resolve().then(() => {
      expect(screen.queryByRole('region', { name: 'Your Intern Shelley level' })).toBeNull()
      expect(localStorage.getItem('vorax.shelleyLevel')).toBe('4')
    })
  })

  it('a player with a level saved from before is asked once too, with it already picked: one click keeps it', () => {
    localStorage.setItem('vorax.shelleyLevel', '3')
    render(<SolverApp />)
    const ask = screen.getByRole('region', { name: 'Your Intern Shelley level' })
    expect(within(ask).getByRole('radio', { name: '3' }).getAttribute('aria-checked')).toBe('true')
    within(ask).getByRole('radio', { name: '3' }).click()
    return Promise.resolve().then(() => {
      expect(screen.queryByRole('region', { name: 'Your Intern Shelley level' })).toBeNull()
      expect(localStorage.getItem('vorax.shelleyLevel')).toBe('3')
    })
  })

  it('once answered, it’s remembered: not asked again', () => {
    localStorage.setItem('vorax.shelleyLevel', '3')
    localStorage.setItem('vorax.shelleyAsked', '1')
    render(<SolverApp />)
    expect(screen.queryByRole('region', { name: 'Your Intern Shelley level' })).toBeNull()
  })

  it('in the app, whose Solver window is hidden, the window opens to ask', () => {
    const showSolver = vi.fn()
    ;(window as unknown as { VoraxDesktop?: unknown }).VoraxDesktop = { logSize: async () => null, readLog: async () => new ArrayBuffer(0), onGame: () => {}, onSnap: () => {}, showAdvice: () => {}, showSolver }
    try {
      render(<SolverApp />)
      expect(showSolver).toHaveBeenCalled()
    } finally {
      delete (window as unknown as { VoraxDesktop?: unknown }).VoraxDesktop
    }
  })
})
