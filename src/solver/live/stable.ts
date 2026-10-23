// The log says when the board changed but not when the cards finished flying in, so before a picture is
// kept, frames are grabbed until two in a row look alike. Tank bubbles and candle flames barely move a
// 96-pixel-wide thumbnail; a dealing hand moves it a lot.

export interface Thumb { w: number; h: number; g: Float32Array }

const THUMB_W = 96

export function thumb(img: ImageData): Thumb {
  const w = THUMB_W
  const h = Math.max(1, Math.round((img.height * w) / img.width))
  const g = new Float32Array(w * h)
  const n = new Float32Array(w * h)
  const sx = w / img.width
  const sy = h / img.height
  const d = img.data
  for (let y = 0; y < img.height; y++) {
    const row = Math.min(h - 1, Math.floor(y * sy)) * w
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4
      const t = row + Math.min(w - 1, Math.floor(x * sx))
      g[t] += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      n[t]++
    }
  }
  for (let i = 0; i < g.length; i++) g[i] /= n[i] || 1
  return { w, h, g }
}

/** Mean absolute grey difference, 0-255. */
export function frameDiff(a: Thumb, b: Thumb): number {
  if (a.g.length !== b.g.length) return 255
  let s = 0
  for (let i = 0; i < a.g.length; i++) s += Math.abs(a.g[i] - b.g[i])
  return s / a.g.length
}

export interface StableOptions { intervalMs?: number; maxMs?: number; threshold?: number; matches?: number; now?: () => number }

export async function waitStable(grab: () => Promise<ImageData>, o: StableOptions = {}): Promise<ImageData> {
  // Two matches in a row (three grabs over 300 ms): a window share can hand back the same cached frame
  // twice in quick succession while the cards are still flying in (seen on a live game, 2026-10-18).
  const { intervalMs = 150, maxMs = 2500, threshold = 1.5, matches = 2, now = () => Date.now() } = o
  const start = now()
  let frame = await grab()
  let prev = thumb(frame)
  let still = 0
  while (now() - start < maxMs) {
    if (intervalMs) await new Promise(r => setTimeout(r, intervalMs))
    frame = await grab()
    const t = thumb(frame)
    still = frameDiff(prev, t) < threshold ? still + 1 : 0
    if (still >= matches) return frame
    prev = t
  }
  return frame
}

export interface Sampler {
  /** a fresh picture, when it and the last two looks all match (the same proof as waitStable's), else null */
  take(): Promise<ImageData | null>
  stop(): void
}

/**
 * Looks at the screen every intervalMs while the log is still settling, so that when it settles a still screen is
 * already proven and its picture taken at once, instead of starting waitStable's three looks only then. Anything
 * short of that proof (too few looks, a change, a failed grab) answers null, and waitStable runs as before.
 */
export function createSampler(grab: () => Promise<ImageData>, o: { intervalMs?: number; maxMs?: number; threshold?: number } = {}): Sampler {
  const { intervalMs = 150, maxMs = 8000, threshold = 1.5 } = o
  let last: Thumb | null = null
  // how many looks in a row matched the one before
  let still = 0
  let stopped = false
  let busy: Promise<void> | null = null
  const look = async () => {
    try {
      const t = thumb(await grab())
      still = last && frameDiff(last, t) < threshold ? still + 1 : 0
      last = t
    } catch {
      last = null
      still = 0
    }
  }
  const timer = setInterval(() => {
    if (stopped || busy) return
    busy = look().finally(() => (busy = null))
  }, intervalMs)
  const end = setTimeout(() => stop(), maxMs)
  function stop() {
    stopped = true
    clearInterval(timer)
    clearTimeout(end)
  }
  return {
    async take() {
      stop()
      if (busy) await busy
      if (!last || still < 1) return null
      try {
        const frame = await grab()
        return frameDiff(last, thumb(frame)) < threshold ? frame : null
      } catch {
        return null
      }
    },
    stop,
  }
}
