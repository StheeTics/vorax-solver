import { render, screen } from '@testing-library/react'
import { Landing } from '@/landing/Landing'
import { MainMenu } from '@/ui/MainMenu'
import { HOME_URL, TARTARUS_URL } from '@/ui/links'

it('landing links to the simulator and the solver', () => {
  render(<Landing />)
  expect(screen.getByRole('link', { name: /^simulator/i }).getAttribute('href')).toMatch(/simulator\.html$/)
  expect(screen.getByRole('link', { name: /^solver/i }).getAttribute('href')).toMatch(/solver\.html$/)
})

it('landing shows the read-only line', () => {
  render(<Landing />)
  expect(screen.getByText('Read-only. It looks at your screen and log; it never clicks or types for you.')).toBeTruthy()
})

it('landing credits Tartarus Simulator', () => {
  render(<Landing />)
  expect(screen.getByRole('link', { name: 'Tartarus Simulator' }).getAttribute('href')).toBe(TARTARUS_URL)
  expect(screen.getByText(/used with permission/)).toBeTruthy()
})

it('main menu links home', () => {
  render(<MainMenu onPlay={() => {}} onSandbox={() => {}} />)
  expect(screen.getByRole('link', { name: /home/i }).getAttribute('href')).toBe(HOME_URL)
})
