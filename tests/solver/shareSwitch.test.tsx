import { fireEvent, render, screen } from '@testing-library/react'
import { ShareSwitch } from '@/solver/share/ShareSwitch'
import { SolverApp } from '@/solver/SolverApp'

it('is on by default, and turning it off is remembered', () => {
  localStorage.clear()
  render(<ShareSwitch />)
  const box = screen.getByRole('switch', { name: 'Share boards to improve the odds' }) as HTMLInputElement
  expect(box.checked).toBe(true)
  fireEvent.click(box)
  expect(localStorage.getItem('vorax.share')).toBe('off')
})

it('the Solver shows the switch on the Board state heading, and says what is shared under What can this see?', () => {
  render(<SolverApp />)
  const heading = screen.getByRole('heading', { name: 'Board state' })
  expect(heading.parentElement!.contains(screen.getByRole('switch', { name: 'Share boards to improve the odds' }))).toBe(true)
  expect(screen.getByText(/Shares the boards it reads \(tanks, cards offered, instruments, round\), with no picture, no account and nothing about you/)).toBeTruthy()
})
