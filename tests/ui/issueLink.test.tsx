import { render, screen } from '@testing-library/react'
import { MainMenu } from '@/ui/MainMenu'
import { EndScreen } from '@/ui/EndScreen'
import { ISSUES_URL } from '@/ui/links'
import { createGame, DEFAULT_SETTINGS } from '@/engine/game'

it('the issues URL points at the public repo', () => {
  expect(ISSUES_URL).toBe('https://github.com/tidewarden/tli-vorax-simulator/issues/new/choose')
})

function expectIssueLink() {
  const link = screen.getByRole('link', { name: /report an issue/i })
  expect(link.getAttribute('href')).toBe(ISSUES_URL)
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('rel')).toContain('noopener')
}

it('end screen has a Report an issue link', () => {
  const s = createGame(DEFAULT_SETTINGS, undefined, 1)
  render(<EndScreen final={s} sandbox={false} onRestart={() => {}} onReplaySetup={() => {}} onMenu={() => {}} />)
  expectIssueLink()
})

import { GameScreen } from '@/ui/game/GameScreen'

it('no fan-made footnote on the main menu or during gameplay', () => {
  render(<MainMenu onPlay={() => {}} onSandbox={() => {}} />)
  const s = createGame(DEFAULT_SETTINGS, undefined, 1)
  render(<GameScreen initial={s} sandbox={false} onExit={() => {}} onEnd={() => {}} />)
  expect(screen.queryByText(/Fan-made practice tool/)).toBeNull()
})

it('sandbox mode is disabled: no Sandbox button on the main menu', () => {
  render(<MainMenu onPlay={() => {}} onSandbox={() => {}} />)
  expect(screen.queryByRole('button', { name: 'Sandbox' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy()
})

it('main menu and game top bar link to the Optimal Play guide in a new tab', () => {
  render(<MainMenu onPlay={() => {}} onSandbox={() => {}} />)
  const menuLink = screen.getByRole('link', { name: /optimal play/i })
  expect(menuLink.getAttribute('href')).toMatch(/optimal-play\.html$/)
  expect(menuLink.getAttribute('target')).toBe('_blank')
})

it('game top bar has the Optimal Play link', () => {
  const s = createGame(DEFAULT_SETTINGS, undefined, 1)
  render(<GameScreen initial={s} sandbox={false} onExit={() => {}} onEnd={() => {}} />)
  expect(screen.getByRole('link', { name: /optimal play/i }).getAttribute('href')).toMatch(/optimal-play\.html$/)
})
