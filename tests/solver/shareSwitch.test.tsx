import { fireEvent, render, screen } from '@testing-library/react'
import { ShareSwitch } from '@/solver/share/ShareSwitch'
import { SolverApp } from '@/solver/SolverApp'

it('is on by default, and turning it off is remembered', () => {
  localStorage.clear()
  render(<ShareSwitch />)
  const box = screen.getByRole('checkbox', { name: /Share card data to improve the odds/ }) as HTMLInputElement
  expect(box.checked).toBe(true)
  fireEvent.click(box)
  expect(localStorage.getItem('vorax.share')).toBe('off')
})

it('the Solver shows the switch and says what is shared', () => {
  render(<SolverApp />)
  expect(screen.getByRole('checkbox', { name: /Share card data/ })).toBeTruthy()
  expect(screen.getByText(/Shares the boards it reads \(tanks, cards offered, instruments, round\), with no picture, no account and nothing about you/)).toBeTruthy()
})
