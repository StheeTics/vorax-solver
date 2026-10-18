import { desktopBridge } from '../desktop/bridge'

/** The live-data collector (worker/), on Cloudflare. Empty would turn sending off. */
export const ENDPOINT = 'https://vorax-live.voraxlab.workers.dev'

const inOverlay = () => !!desktopBridge()

/**
 * Sending happens only on the published site: never from this PC, a dev build, or with no collector. Inside
 * Vorax Overlay it happens from any copy of the site, local ones included: the app is only ever pointed at
 * the real game, so its boards are real games.
 */
export function sendingAllowed(loc: { hostname: string } = location, endpoint = ENDPOINT, dev = import.meta.env.DEV, overlay = inOverlay()): boolean {
  if (!endpoint) return false
  return overlay || (!dev && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(loc.hostname))
}

/** The version a shared board carries: the site's build, marked when it came through Vorax Overlay. */
export const appTag = (build: string, overlay = inOverlay()) => (overlay ? `${build}-overlay` : build)
