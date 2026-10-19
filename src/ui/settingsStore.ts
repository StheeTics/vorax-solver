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

const ASKED = 'vorax.shelleyAsked'

/** Whether the player has answered "Which Intern Shelley level do you have?". Everyone is asked once, those
 *  with a level saved from before too: it used to default to 6 without a word. */
export function shelleyChosen(): boolean {
  try {
    return localStorage.getItem(ASKED) === '1'
  } catch {
    return false
  }
}

export function saveShelleyLevel(level: number): void {
  try {
    localStorage.setItem(KEY, String(level))
    localStorage.setItem(ASKED, '1')
  } catch {
    // Storage unavailable (private window etc.) — the level just won't persist.
  }
}

/** Run settings for the remembered Shelley level. */
export function loadSettings(): Settings {
  return settingsForShelley(loadShelleyLevel())
}
