import { render, screen, within } from '@testing-library/react'
import { SolverApp } from '@/solver/SolverApp'
import { HOME_URL } from '@/ui/links'

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

it('says plainly that it is a work in progress that playing helps improve', () => {
  render(<SolverApp />)
  const note = screen.getByRole('note', { name: 'Work in progress' })
  expect(note.textContent).toMatch(/work in progress/i)
  expect(note.textContent).toMatch(/odds/i)
  expect(note.textContent).toMatch(/instruments/i)
  expect(note.textContent).toMatch(/improve/i)
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
