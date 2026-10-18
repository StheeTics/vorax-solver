import { liveSupported, type Source } from './types'

const KEY = 'vorax.solverSource'
const SOURCES: Source[] = ['live', 'screenshot', 'manual']

export function loadSource(): Source {
  const fallback: Source = liveSupported() ? 'live' : 'manual'
  try {
    const s = localStorage.getItem(KEY) as Source | null
    if (!s || !SOURCES.includes(s)) return fallback
    return s === 'live' && !liveSupported() ? 'manual' : s
  } catch {
    return fallback
  }
}

export function saveSource(s: Source): void {
  try {
    localStorage.setItem(KEY, s)
  } catch {
    // Storage unavailable: the choice just isn't remembered.
  }
}
