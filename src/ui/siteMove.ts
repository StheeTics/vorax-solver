// The site moved from GitHub Pages to Cloudflare Pages. A visitor at the old address is sent to the same page
// at the new one, with what they saved here (settings, Shelley level, install number, unsent boards, named cards)
// in the address after "#", which browsers never send to a server; the new address adds it without overwriting
// anything and clears it from the address bar. Inside Vorax Overlay nothing moves: the app moves itself (0.1.10,
// desktop/lib/site.js), and a page that left the app's address would leave the app stuck.
import { loadLocalRefs, mergeLocalRefs } from '@/solver/scan/localRefs'
import type { LocalRefs } from '@/solver/scan/scan'

export const OLD_HOST = 'tidewarden.github.io'
export const NEW_ORIGIN = 'https://voraxlab.pages.dev'
const MARK = 'vorax-move='
/** an address stays well within what every browser takes (Chrome's 2 MB, Safari's far less in practice) */
export const MAX_CARRIED = 200_000
const QUEUE = 'vorax.share.queue'
const NOTICE = 'vorax.movedNotice'

export interface Carried { local: Record<string, string>; refs: LocalRefs }

const inApp = () => 'VoraxDesktop' in window || /Electron/.test(navigator.userAgent)

const toBase64Url = (text: string) => {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromBase64Url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))
}

/** What's carried, as the address's "#" part: when it's too long, only the newest unsent boards that fit go. */
export function encodeCarried(c: Carried, max = MAX_CARRIED): string {
  let local = c.local
  let out = toBase64Url(JSON.stringify({ local, refs: c.refs }))
  if (out.length <= max || !local[QUEUE]) return out
  let queue: unknown[]
  try {
    queue = JSON.parse(local[QUEUE])
  } catch {
    queue = []
  }
  while (out.length > max) {
    queue = queue.slice(Math.max(1, Math.ceil(queue.length / 4)))
    local = { ...c.local, [QUEUE]: JSON.stringify(queue) }
    out = toBase64Url(JSON.stringify({ local, refs: c.refs }))
    if (!queue.length) break
  }
  return out
}

export function decodeCarried(s: string): Carried | null {
  try {
    const v = JSON.parse(fromBase64Url(s)) as Carried
    return v && typeof v.local === 'object' && typeof v.refs === 'object' ? v : null
  } catch {
    return null
  }
}

/** The same page at the new address: Cloudflare Pages serves solver.html as /solver. */
export function newAddress(loc: { pathname: string; search: string }, carried: string): string {
  return `${NEW_ORIGIN}${loc.pathname.replace(/\.html$/, '')}${loc.search}#${MARK}${carried}`
}

/** At the old address and not in the app: sends the visitor on with what they saved; true when it did. */
export async function leaveOldSite(loc: Location = location): Promise<boolean> {
  if (loc.hostname !== OLD_HOST || inApp()) return false
  const local: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      const v = k === null ? null : localStorage.getItem(k)
      if (k !== null && v !== null) local[k] = v
    }
  } catch {
    // storage blocked: the visitor moves with nothing
  }
  loc.replace(newAddress(loc, encodeCarried({ local, refs: await loadLocalRefs() })))
  return true
}

/** At the new address with something carried: kept without overwriting, and cleared from the address bar. */
export async function arriveFromOldSite(loc: Location = location): Promise<number> {
  const at = loc.hash.indexOf(MARK)
  if (at < 0) return 0
  history.replaceState(null, '', loc.pathname + loc.search)
  const c = decodeCarried(loc.hash.slice(at + MARK.length))
  if (!c) return 0
  let added = 0
  try {
    for (const [k, v] of Object.entries(c.local)) {
      if (typeof v === 'string' && localStorage.getItem(k) === null) {
        localStorage.setItem(k, v)
        added++
      }
    }
    if (localStorage.getItem(NOTICE) === null) localStorage.setItem(NOTICE, 'show')
  } catch {
    // storage blocked: nothing kept
  }
  return added + (await mergeLocalRefs(c.refs))
}

/** Once, after arriving from the old address: the new one, to bookmark. */
function showMovedNotice() {
  try {
    if (localStorage.getItem(NOTICE) !== 'show') return
  } catch {
    return
  }
  const bar = document.createElement('div')
  bar.setAttribute('role', 'status')
  bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:1000;display:flex;gap:12px;justify-content:center;align-items:center;padding:10px 16px;background:var(--glass-deep,#1a0d0f);color:var(--text,#eee);font:14px var(--font-body,sans-serif);border-top:1px solid var(--gold-lo,#7a5a2a)'
  const text = document.createElement('span')
  text.textContent = 'Vorax has moved to voraxlab.pages.dev. Update your bookmark.'
  const ok = document.createElement('button')
  ok.textContent = 'Got it'
  ok.style.cssText = 'padding:4px 12px;cursor:pointer'
  ok.onclick = () => {
    try {
      localStorage.setItem(NOTICE, 'seen')
    } catch {
      // shown again next time
    }
    bar.remove()
  }
  bar.append(text, ok)
  document.body.append(bar)
}

/** Every page starts here: the old address sends the visitor on, the new one takes what came with them first. */
export async function startPage(render: () => void): Promise<void> {
  // anything going wrong in the move shows the page here as before, never a blank one
  try {
    if (await leaveOldSite()) return
  } catch {
    // stays at the old address
  }
  try {
    await arriveFromOldSite()
  } catch {
    // starts without what came along
  }
  render()
  showMovedNotice()
}
