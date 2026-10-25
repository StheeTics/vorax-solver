// On the dev server only: every board read is sent to it (vite.config.ts slowReads), the picture and what was read
// (each card's name, step and time), to training/reads/, so the slow cards can be studied on the real picture; a
// slow one has "slow" in its name.
import type { Reading } from '../types'

/** A card's name taking every try (3) or none settling it (4), or the names over a second in all. */
export const isSlow = (r: Reading) => (r.timing?.steps ?? []).some(s => s >= 3) || (r.timing?.names ?? 0) >= 1000

export const slowReadsOn = () => import.meta.env.DEV

let worker: Worker | null = null
let ids = 0
const waiting = new Map<number, (ok: boolean) => void>()

/** Saves the board's picture and read on the dev server, encoded in a worker (saveWorker.ts) so the page's thread
 *  stays free for the next board's read. */
export async function sendSlow(img: ImageData, reading: Reading, at = new Date()): Promise<string> {
  const base = `${at.toISOString().replace(/[:.]/g, '-')}-${(reading.timing?.steps ?? []).join('')}${isSlow(reading) ? '-slow' : ''}`
  if (!worker) {
    worker = new Worker(new URL('./saveWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean }>) => {
      waiting.get(e.data.id)?.(e.data.ok)
      waiting.delete(e.data.id)
    }
  }
  const id = ++ids
  // a copy of the pixels, handed over: the board's own picture stays with the page
  const data = img.data.slice().buffer
  const ok = await new Promise<boolean>(done => {
    waiting.set(id, done)
    worker!.postMessage({ id, url: `${import.meta.env.BASE_URL}__slow-read?name=`, base, width: img.width, height: img.height, data, json: JSON.stringify(reading, null, 2) }, [data])
  })
  if (!ok) throw new Error('not saved')
  return `training/reads/${base}.png`
}
