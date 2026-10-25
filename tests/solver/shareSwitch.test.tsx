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
  // that sharing starts on, and what a board carries
  expect(screen.getByText(/Shares, unless you turn it off with the switch beside Board state \(it starts on\): the boards it reads \(tanks, cards offered, instruments, round, the advice shown\), with no picture, no account and nothing about you but a random install number/)).toBeTruthy()
  // the setup details shared with each board are said plainly too
  expect(screen.getByText(/the picture’s size, your screen’s scaling, whether it’s HDR, your browser and its version, how the numbers read, how long reading took, and in the app the game window’s size/)).toBeTruthy()
  // and that the card pictures it sends are published
  expect(screen.getByText(/These pictures are published with the project on GitHub/)).toBeTruthy()
})
