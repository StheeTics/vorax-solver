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

it('main menu has a Report an issue link', () => {
  render(<MainMenu onPlay={() => {}} onSandbox={() => {}} onSettings={() => {}} />)
  expectIssueLink()
})

it('end screen has a Report an issue link', () => {
  const s = createGame(DEFAULT_SETTINGS, undefined, 1)
  render(<EndScreen final={s} sandbox={false} onRestart={() => {}} onReplaySetup={() => {}} onMenu={() => {}} />)
  expectIssueLink()
})
