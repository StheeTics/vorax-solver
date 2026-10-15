import { render, screen } from '@testing-library/react'
import { loadSettings, saveSettings } from '@/ui/settingsStore'
import { SettingsScreen } from '@/ui/Settings'
import { DEFAULT_SETTINGS } from '@/engine/game'

afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })

it('falls back to defaults when storage throws', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  expect(() => saveSettings({ potionRefreshes: 1, instrumentRefreshes: 1 })).not.toThrow()
})

it('clamps stored values to 0–3 / 0–2', () => {
  localStorage.setItem('vorax.settings', JSON.stringify({ potionRefreshes: 9, instrumentRefreshes: -1 }))
  expect(loadSettings()).toEqual({ potionRefreshes: 3, instrumentRefreshes: 0 })
})

it('round-trips saved settings', () => {
  saveSettings({ potionRefreshes: 1, instrumentRefreshes: 0 })
  expect(loadSettings()).toEqual({ potionRefreshes: 1, instrumentRefreshes: 0 })
})

it('settings inputs are capped at 3 and 2', () => {
  render(<SettingsScreen onBack={() => {}} />)
  expect(screen.getByLabelText('Potion refreshes').getAttribute('max')).toBe('3')
  expect(screen.getByLabelText('Instrument refreshes').getAttribute('max')).toBe('2')
})
