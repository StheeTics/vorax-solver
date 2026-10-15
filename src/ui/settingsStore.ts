import { DEFAULT_SETTINGS } from '@/engine/game'
import type { Settings } from '@/engine/types'

const KEY = 'vorax.settings'

const clamp = (v: unknown, max: number, fallback: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback
  return Math.min(max, Math.max(0, n))
}

export function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  return {
    potionRefreshes: clamp(raw?.potionRefreshes, 3, DEFAULT_SETTINGS.potionRefreshes),
    instrumentRefreshes: clamp(raw?.instrumentRefreshes, 2, DEFAULT_SETTINGS.instrumentRefreshes),
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return normalizeSettings(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(normalizeSettings(s)))
  } catch {
    // Storage unavailable (private window etc.) — settings just won't persist.
  }
}
