// A panel icon a player named ("Which instrument did you pick?") is shared like the boards: its name and
// the icon's 24x24 grey pattern, never a screenshot, and only with sharing on, from the published site.
import { ENDPOINT, sendingAllowed } from './endpoint'
import { loadShare } from './shareStore'

interface Deps { on: boolean; allowed: boolean; endpoint: string; post: typeof fetch }

export async function shareIcon(name: string, pattern: number[], deps: Deps = { on: loadShare(), allowed: sendingAllowed(), endpoint: ENDPOINT, post: (...a) => fetch(...a) }): Promise<void> {
  if (!deps.on || !deps.allowed) return
  const body = JSON.stringify({ uid: crypto.randomUUID(), name, pattern: pattern.map(v => Math.round(v * 1000) / 1000 || 0) })
  try {
    await deps.post(`${deps.endpoint}/v1/icons`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true })
  } catch {
    // not shared: it's still remembered in this browser
  }
}
