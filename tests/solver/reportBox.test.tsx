import { render, screen } from '@testing-library/react'
import { ReportBox } from '@/solver/report/ReportBox'
import { emptyState, type Reading } from '@/solver/types'

const base: Reading = { state: emptyState(), fields: {}, problems: [], frame: { width: 10, height: 10 } }

it('shows Copy and the GitHub link for an unknown card', () => {
  render(<ReportBox reading={{ ...base, problems: [{ kind: 'unknownArt', field: 'hand0', crop: { x: 0, y: 0, w: 1, h: 1 } }] }} corrections={{}} source="live" frame={null} />)
  expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
  const link = screen.getByRole('link', { name: 'Open an issue on GitHub' })
  expect(link.getAttribute('href')).toContain('template=solver-reading.yml')
  expect(link.getAttribute('target')).toBe('_blank')
})

it('shows the paste note when the report is too long to prefill', () => {
  const many = Array.from({ length: 400 }, (_, i) => ({ kind: 'unknownName' as const, name: `Some very long unknown card name number ${i}` }))
  render(<ReportBox reading={{ ...base, problems: many }} corrections={{}} source="live" frame={null} />)
  expect(screen.getByText(/too long for the link/)).toBeTruthy()
})

it('only a quiet link when there are corrections but no problems', () => {
  render(<ReportBox reading={base} corrections={{ 'tank0.activity': '5' }} source="live" frame={null} />)
  expect(screen.getByText('Reading was wrong? Report it')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull()
})

it('nothing when the reading was fine and untouched', () => {
  const { container } = render(<ReportBox reading={base} corrections={{}} source="live" frame={null} />)
  expect(container.textContent).toBe('')
})
