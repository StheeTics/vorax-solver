import { fireEvent, render, screen } from '@testing-library/react'
import { SolverApp } from '@/solver/SolverApp'
import { HOME_URL } from '@/ui/links'

it('has a home link, the privacy panel and the attribution', () => {
  render(<SolverApp />)
  expect(screen.getByRole('link', { name: /home/i }).getAttribute('href')).toBe(HOME_URL)
  expect(screen.getByText('What can this see?')).toBeTruthy()
  expect(screen.getByText('Never clicks or types for you.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Tartarus Simulator' })).toBeTruthy()
})

it('Live is disabled with a note where the browser lacks support', () => {
  render(<SolverApp />)
  expect((screen.getByRole('radio', { name: 'Live' }) as HTMLInputElement).disabled).toBe(true)
  expect(screen.getByText('Live needs Chrome or Edge on a PC. Screenshot and Manual work here.')).toBeTruthy()
})

it('switching source is remembered', () => {
  render(<SolverApp />)
  fireEvent.click(screen.getByRole('radio', { name: 'Screenshot' }))
  expect(localStorage.getItem('vorax.solverSource')).toBe('screenshot')
})

it('says plainly that it is a work in progress that playing helps improve', () => {
  render(<SolverApp />)
  const note = screen.getByRole('note', { name: 'Work in progress' })
  expect(note.textContent).toMatch(/work in progress/i)
  expect(note.textContent).toMatch(/odds/i)
  expect(note.textContent).toMatch(/instruments/i)
  expect(note.textContent).toMatch(/improve/i)
})
