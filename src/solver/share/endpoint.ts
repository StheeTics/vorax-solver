/** The live-data collector (worker/), on Cloudflare. Empty would turn sending off. */
export const ENDPOINT = 'https://vorax-live.voraxlab.workers.dev'

/** Sending happens only on the published site: never from this PC, a dev build, or with no collector. */
export function sendingAllowed(loc: { hostname: string } = location, endpoint = ENDPOINT, dev = import.meta.env.DEV): boolean {
  return !!endpoint && !dev && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(loc.hostname)
}
