// The player's setup, as shared with each board to find out why one misreads: the browser, the screen's
// scaling and whether it's HDR. Nothing that tells who it is.

export interface Environment { dpr: number; hdr: boolean; browser: string }

/** The browser and its major version, from the user agent ("Edge 131"); the app's is "Electron …". */
export function browserOf(ua: string): string {
  for (const [name, re] of [['Electron', /Electron\/(\d+)/], ['Edge', /Edg\/(\d+)/], ['Firefox', /Firefox\/(\d+)/], ['Chrome', /Chrome\/(\d+)/]] as const) {
    const m = re.exec(ua)
    if (m) return `${name} ${m[1]}`
  }
  return 'other'
}

export function environment(): Environment {
  const hdr = typeof matchMedia === 'function' && matchMedia('(dynamic-range: high)').matches
  return { dpr: Math.round((globalThis.devicePixelRatio ?? 1) * 100) / 100, hdr, browser: browserOf(globalThis.navigator?.userAgent ?? '') }
}
