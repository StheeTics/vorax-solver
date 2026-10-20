const KEY = 'vorax.share'

/** Whether boards are shared for the odds study: on unless the player turned it off. */
export function loadShare(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveShare(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // not remembered
  }
}

const INSTALL = 'vorax.install'
let session: string | null = null

/**
 * A random number made the first time this browser or app shares, and kept: the collector counts players by it (the
 * daily hash of the address it keys its limits on can't tell one player's days apart). Nothing about the player goes
 * into it. Where storage is blocked, one for this visit.
 */
export function installId(): string {
  try {
    const kept = localStorage.getItem(INSTALL)
    if (kept) return kept
    const id = crypto.randomUUID()
    localStorage.setItem(INSTALL, id)
    return id
  } catch {
    return (session ??= crypto.randomUUID())
  }
}
