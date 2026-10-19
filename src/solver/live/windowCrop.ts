// A windowed game's capture holds its title bar and borders, and is often shrunk to fit: everything the reader
// looks for is then shifted, and the small tank labels and instrument icons are missed. Vorax Overlay measures
// the window and the picture inside it (Windows' client area), so the game alone can be cut out first.
import type { GameWindow } from '../share/snapshot'
import type { Rect } from '../types'

/** The game's picture inside a capture of its whole window, or null when there's no frame around it. The
 *  borders are taken as equal left, right and bottom; the title bar is the rest at the top. */
export function gameArea(frame: { width: number; height: number }, win: GameWindow): Rect | null {
  const [ow, oh] = win.outer
  const [cw, ch] = win.client
  if (ow === cw && oh === ch) return null
  if (cw > ow || ch > oh || cw <= 0 || ch <= 0) return null
  const sx = frame.width / ow
  const sy = frame.height / oh
  const side = (ow - cw) / 2
  const top = oh - ch - side
  return { x: side * sx, y: top * sy, w: cw * sx, h: ch * sy }
}

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
