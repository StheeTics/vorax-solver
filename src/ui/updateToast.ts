// Tells a visitor when the site has been updated since they opened the page: every build publishes
// version.json (its commit, see vite.config.ts), and the page compares it with the build it was loaded from.
// The toast stays until they refresh. Plain DOM so every page, React or not, can use it.
import './updateToast.css'

const CHECK_EVERY_MS = 5 * 60_000
/** the commit this page was built from */
const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev'

export type FetchLive = () => Promise<{ build: string }>

const fetchLive: FetchLive = async () => {
  const r = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`version.json: ${r.status}`)
  return r.json()
}

function showToast() {
  if (document.querySelector('.update-toast')) return
  const toast = document.createElement('div')
  toast.className = 'update-toast'
  toast.setAttribute('role', 'status')
  const text = document.createElement('span')
  text.textContent = 'A new version of the site is out.'
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Refresh'
  button.addEventListener('click', () => window.location.reload())
  toast.append(text, button)
  document.body.append(toast)
}

/** Shows the toast when the live build differs from `current`; a failed check (offline) shows nothing. */
export async function checkForUpdate(current: string, live: FetchLive = fetchLive): Promise<void> {
  try {
    const { build } = await live()
    if (build && build !== current) showToast()
  } catch {
    // offline or mid-deploy: the next check tries again
  }
}

/** Checks now, every few minutes, and whenever the tab comes back into view. Never in development. */
export function watchForUpdates(current: string = BUILD, live: FetchLive = fetchLive): void {
  if (current === 'dev') return
  const check = () => void checkForUpdate(current, live)
  check()
  setInterval(check, CHECK_EVERY_MS)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
}
