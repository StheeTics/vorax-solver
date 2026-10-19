import { DEFAULT_SHELLEY_LEVEL, SHELLEY_LEVELS, settingsForShelley } from '@/data/shelley'
import type { Settings } from '@/engine/types'

const KEY = 'vorax.shelleyLevel'

export function loadShelleyLevel(): number {
  try {
    const n = Number(localStorage.getItem(KEY))
    return (SHELLEY_LEVELS as readonly number[]).includes(n) ? n : DEFAULT_SHELLEY_LEVEL
  } catch {
    return DEFAULT_SHELLEY_LEVEL
  }
}

/** Whether the player has picked their Intern Shelley level (until then the default stands in for it). */
export function shelleyChosen(): boolean {
  try {
    return (SHELLEY_LEVELS as readonly number[]).includes(Number(localStorage.getItem(KEY)))
  } catch {
    return false
  }
}

export function saveShelleyLevel(level: number): void {
  try {
    localStorage.setItem(KEY, String(level))
  } catch {
    // Storage unavailable (private window etc.) — the level just won't persist.
  }
}

/** Run settings for the remembered Shelley level. */
export function loadSettings(): Settings {
  return settingsForShelley(loadShelleyLevel())
}
