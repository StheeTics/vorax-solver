import { render, screen, fireEvent } from '@testing-library/react'
import { loadShelleyLevel, saveShelleyLevel, loadSettings } from '@/ui/settingsStore'
import { MainMenu } from '@/ui/MainMenu'

afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })

it('defaults to Shelley level 6 and falls back to it when storage throws', () => {
  expect(loadShelleyLevel()).toBe(6)
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  expect(loadShelleyLevel()).toBe(6)
  expect(() => saveShelleyLevel(2)).not.toThrow()
})

it('remembers the level, clamps bad values, and derives the run settings from it', () => {
  saveShelleyLevel(2)
  expect(loadShelleyLevel()).toBe(2)
  expect(loadSettings()).toEqual({ potionRefreshes: 3, instrumentRefreshes: 1 })
  localStorage.setItem('vorax.shelleyLevel', '42')
  expect(loadShelleyLevel()).toBe(6)
  localStorage.setItem('vorax.shelleyLevel', 'abc')
  expect(loadShelleyLevel()).toBe(6)
})

it('main menu: Shelley level picker replaces the Settings button and shows the bonus', () => {
  render(<MainMenu onPlay={() => {}} onSandbox={() => {}} />)
  expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull()
  expect(screen.getByRole('radio', { name: '6' }).getAttribute('aria-checked')).toBe('true')
  expect(screen.getByText(/\+2 Surgical Instrument refreshes/)).toBeTruthy()
  fireEvent.click(screen.getByRole('radio', { name: '1' }))
  expect(screen.getByRole('radio', { name: '1' }).getAttribute('aria-checked')).toBe('true')
  expect(screen.getByText(/\+0 Surgical Instrument refreshes/)).toBeTruthy()
  expect(loadShelleyLevel()).toBe(1)
})

it('the compact picker (the Solver’s) says the bonus briefly, on the label’s own line', async () => {
  const { ShelleyPicker } = await import('@/ui/ShelleyPicker')
  render(<ShelleyPicker level={6} onChange={() => {}} compact />)
  const label = screen.getByText('Intern Shelley level')
  expect(label.textContent).toMatch(/^Intern Shelley level\s*\+2 refreshes$/)
})
