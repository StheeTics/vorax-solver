import { render, screen } from '@testing-library/react'
import { Landing } from '@/landing/Landing'
import { MainMenu } from '@/ui/MainMenu'
import { HOME_URL } from '@/ui/links'

it('landing links to the simulator and to the solver in the browser', () => {
  render(<Landing />)
  expect(screen.getByRole('link', { name: 'Open the Simulator' }).getAttribute('href')).toMatch(/simulator\.html$/)
  expect(screen.getByRole('link', { name: 'Open the Solver' }).getAttribute('href')).toMatch(/solver\.html$/)
})

it('opening the Solver is the main action, and the steps to use it come in order', () => {
  render(<Landing />)
  expect(screen.getByRole('link', { name: 'Open the Solver' }).className).toMatch(/primary/)
  const steps = screen.getByRole('list', { name: 'How the Solver works' })
  expect(steps.tagName).toBe('OL')
  expect(steps.textContent).toMatch(/Enable Log.*connect your game.*Play/s)
})

it('landing shows the read-only line', () => {
  render(<Landing />)
  expect(screen.getByText('Read-only. It looks at your screen and log; it never clicks or types for you.')).toBeTruthy()
})

it('landing has no credit line or fan-made footnote', () => {
  render(<Landing />)
  expect(screen.queryByText(/used with permission/)).toBeNull()
  expect(screen.queryByText(/Fan-made practice tool/)).toBeNull()
})

it('main menu links home', () => {
  render(<MainMenu onPlay={() => {}} onSandbox={() => {}} />)
  expect(screen.getByRole('link', { name: /home/i }).getAttribute('href')).toBe(HOME_URL)
})

it('doesn’t push the Windows app download from the landing page (the Solver page offers it)', () => {
  render(<Landing />)
  expect(screen.queryByRole('link', { name: /Download/ })).toBeNull()
})
