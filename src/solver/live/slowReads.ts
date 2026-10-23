// On the dev server only: a board whose card names read slowly is sent to it (vite.config.ts slowReads), the
// picture and what was read, to training/slow/, so the slow cards can be studied on the real picture.
import type { Reading } from '../types'
import { toPng } from './windowCapture'

/** A card's name taking every try (3) or none settling it (4), or the names over a second in all. */
export const isSlow = (r: Reading) => (r.timing?.steps ?? []).some(s => s >= 3) || (r.timing?.names ?? 0) >= 1000

export const slowReadsOn = () => import.meta.env.DEV

const send = (name: string, body: Blob | string) => fetch(`${import.meta.env.BASE_URL}__slow-read?name=${name}`, { method: 'POST', body })

export async function sendSlow(img: ImageData, reading: Reading, at = new Date()): Promise<string> {
  const base = `${at.toISOString().replace(/[:.]/g, '-')}-${(reading.timing?.steps ?? []).join('')}`
  await send(`${base}.png`, await toPng(img))
  await send(`${base}.json`, JSON.stringify(reading, null, 2))
  return `training/slow/${base}.png`
}
