// The text reader in the browser: Tesseract, loaded the first time it's needed (its English data comes from
// a CDN), three workers so a hand's names are read side by side. null when it can't load: the cards are
// then read from their pictures alone.
import type { Img } from './pixels'
import type { ReadText } from './titles'
import { cachedTextReader } from './textCache'

const WORKERS = 3

// Tesseract reads a canvas (not raw ImageData)
function toCanvas(img: Img): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0)
  return c
}
/** A card title's size and look, dark text on light, for the workers' practice read. */
function practiceTitle(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 490
  c.height = 100
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#222'
  g.font = '32px sans-serif'
  g.fillText('Compound Leech', 60, 42)
  g.fillText('Solution', 140, 84)
  return c
}

let pool: Promise<ReadText | null> | null = null

export function browserTextReader(): Promise<ReadText | null> {
  pool ??= (async () => {
    const T = await import('tesseract.js')
    const scheduler = T.createScheduler()
    const workers = await Promise.all(Array.from({ length: WORKERS }, () => T.createWorker('eng')))
    for (const w of workers) {
      await w.setParameters({ tessedit_pageseg_mode: T.PSM.SINGLE_BLOCK })
      scheduler.addWorker(w)
    }
    // each worker reads a practice title now: its first read sets it up (~0.5-1 s), which the first board paid for
    const t0 = Date.now()
    await Promise.all(workers.map(w => w.recognize(practiceTitle()).catch(() => null)))
    console.info(`[timing] warm-up: text reader ready in ${Date.now() - t0} ms`)
    // a title read early, while the tanks settle, isn't read again from the settled picture
    return cachedTextReader(async (img: Img) => (await scheduler.addJob('recognize', toCanvas(img))).data.text)
  })().catch(() => {
    pool = null
    return null
  })
  return pool
}
