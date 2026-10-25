import { fireEvent, render, screen } from '@testing-library/react'
import { ReportBox } from '@/solver/report/ReportBox'
import { emptyState, type Reading } from '@/solver/types'

const base: Reading = { state: emptyState(), fields: {}, problems: [], frame: { width: 10, height: 10 } }

it('open by itself for an unknown card: Copy report and the GitHub issue', () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  render(<ReportBox reading={{ ...base, problems: [{ kind: 'unknownArt', field: 'hand0', crop: { x: 0, y: 0, w: 1, h: 1 } }] }} corrections={{}} source="live" frame={null} />)
  expect(screen.getByRole('button', { name: 'Copy report' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Open an issue on GitHub' }))
  expect(open).toHaveBeenCalledWith(expect.stringContaining('template=solver-reading.yml'), '_blank', 'noopener,noreferrer')
  open.mockRestore()
})

it('shows the paste note when the report is too long to prefill', () => {
  const many = Array.from({ length: 400 }, (_, i) => ({ kind: 'unknownName' as const, name: `Some very long unknown card name number ${i}` }))
  render(<ReportBox reading={{ ...base, problems: many }} corrections={{}} source="live" frame={null} />)
  expect(screen.getByText(/too long for the link/)).toBeTruthy()
})

it('any board can be reported: a quiet "Report this board" that opens the report', () => {
  render(<ReportBox reading={base} corrections={{}} source="live" frame={null} />)
  expect(screen.queryByRole('button', { name: 'Copy report' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Report this board' }))
  expect(screen.getByRole('button', { name: 'Copy report' })).toBeTruthy()
})

it('with a screenshot: copies it to paste into the issue, in the same click that opens the issue', async () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const write = vi.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { write } })
  vi.stubGlobal('ClipboardItem', class { constructor(public items: Record<string, unknown>) {} })
  render(<ReportBox reading={base} corrections={{}} source="live" frame={{ width: 1, height: 1, data: new Uint8ClampedArray(4) } as ImageData} />)
  fireEvent.click(screen.getByRole('button', { name: 'Report this board' }))
  fireEvent.click(screen.getByRole('button', { name: 'Copy screenshot and open an issue' }))
  expect(write).toHaveBeenCalledTimes(1)
  expect(open).toHaveBeenCalledTimes(1)
  expect(await screen.findByText(/paste it into the issue with Ctrl\+V/)).toBeTruthy()
  open.mockRestore()
  vi.unstubAllGlobals()
})

it('nothing before a board is read', () => {
  const { container } = render(<ReportBox reading={null} corrections={{}} source="live" frame={null} />)
  expect(container.textContent).toBe('')
})
