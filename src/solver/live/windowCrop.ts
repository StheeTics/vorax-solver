// A windowed game's capture holds its title bar and borders, and is often shrunk to fit: everything the reader
// looks for is then shifted, and the small tank labels and instrument icons are missed. The title bar is found
// in the picture itself (windowedGame), on the website as in the app, and the game alone is read.
import type { Rect } from '../types'

/** The part of a picture inside `r`. */
export function cropTo<T extends { width: number; height: number; data: Uint8ClampedArray }>(img: T, r: Rect): { width: number; height: number; data: Uint8ClampedArray } {
  const x0 = Math.max(0, Math.round(r.x))
  const y0 = Math.max(0, Math.round(r.y))
  const w = Math.min(img.width - x0, Math.round(r.w))
  const h = Math.min(img.height - y0, Math.round(r.h))
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) data.set(img.data.subarray(((y0 + y) * img.width + x0) * 4, ((y0 + y) * img.width + x0 + w) * 4), y * w * 4)
  return { width: w, height: h, data }
}

/** The title bar: a band of rows of one colour (Windows' light or dark title), from the top. */
const TITLE = { min: 16, max: 80, share: 0.8, near: 24 }

/** The mean colour of a row, and the share of its pixels near it. */
function rowColour(img: { width: number; data: Uint8ClampedArray }, y: number): { mean: [number, number, number]; even: number } {
  const w = img.width
  const mean: [number, number, number] = [0, 0, 0]
  for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) mean[c] += img.data[(y * w + x) * 4 + c] / w
  let near = 0
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    if (Math.max(...[0, 1, 2].map(c => Math.abs(img.data[i + c] - mean[c]))) <= TITLE.near) near++
  }
  return { mean, even: near / w }
}

/**
 * The game's picture inside a capture of its window, found from the picture: a title bar (rows of one colour,
 * not the game's near-black) across the top under a 1-pixel border, a 1-pixel border on the sides and bottom.
 * Null for a borderless or fullscreen game. Seen on Windows 11: 30 rows of title under a border row, at 1080
 * and at 1440 (issues #2, #3).
 */
export function windowedGame(img: { width: number; height: number; data: Uint8ClampedArray }): Rect | null {
  if (img.height < 200) return null
  const first = rowColour(img, 1)
  // a title bar isn't black (the game's top edge, a masked test frame, is)
  if (first.even < TITLE.share || Math.max(...first.mean) < 28) return null
  let end = 1
  for (let y = 2; y < TITLE.max; y++) {
    // a row of title text is less even, but still, on average, the title's colour
    if (!rowColour(img, y).mean.every((v, c) => Math.abs(v - first.mean[c]) <= 12)) break
    end = y
  }
  if (end < TITLE.min) return null
  // a window's edge above the title and a border under it, each a line of another colour: a game screen that's
  // evenly dark at the top (a loading screen) has neither
  const differs = (y: number) => rowColour(img, y).mean.some((v, c) => Math.abs(v - first.mean[c]) > 8)
  if (!differs(0) || !differs(end + 1)) return null
  // the game starts under the title's bottom border row
  const top = end + 2
  return { x: 1, y: top, w: img.width - 2, h: img.height - top - 1 }
}
