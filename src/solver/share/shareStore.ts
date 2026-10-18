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
