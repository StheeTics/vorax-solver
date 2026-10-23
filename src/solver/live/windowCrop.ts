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
/** inside: a row in the title whatever the edge; edge: the most rows the window's edge spans, blurred;
 *  flat: how near one colour a title is without an edge to go by (Windows draws it flat, the game's own top bar
 *  has a gradient: 4 of 234 game-only frames passed for a title without this) */
const TITLE = { min: 16, max: 80, share: 0.8, near: 24, inside: 5, edge: 4, flat: { near: 6, share: 0.9 } }

/** The mean colour of a row, and the share of its pixels within `near` of it. */
function rowColour(img: { width: number; data: Uint8ClampedArray }, y: number, nearBy = TITLE.near): { mean: [number, number, number]; even: number } {
  const w = img.width
  const mean: [number, number, number] = [0, 0, 0]
  for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) mean[c] += img.data[(y * w + x) * 4 + c] / w
  let near = 0
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    if (Math.max(...[0, 1, 2].map(c => Math.abs(img.data[i + c] - mean[c]))) <= nearBy) near++
  }
  return { mean, even: near / w }
}

/**
 * The game's picture inside a capture of its window, found from the picture: a title bar (rows of one colour,
 * not the game's near-black) across the top under the window's edge, and an edge as thick on the sides and bottom.
 * Null for a borderless or fullscreen game. Seen on Windows 11: 30 rows of title under a 1-row edge, at 1080 and
 * 1440 (issues #2, #3). A capture shrunk or stretched to fit (a 4K screen at 150%: issues #5, #7, #10) blurs that
 * edge over a row or two, so the title is found from inside it, and the edge taken as however many rows it spans.
 * Many windows' captures have no edge above the title at all: 0 of the 1866x1080 windowed boards shared since
 * Oct 21 read. Without an edge the title alone can't be told from a game screen that's dark across the top, so
 * it's taken only when the window is known to have a frame: `framed`, from Vorax Overlay (its outer size
 * isn't its picture's).
 */
export function windowedGame(img: { width: number; height: number; data: Uint8ClampedArray }, framed = false): Rect | null {
  if (img.height < 200) return null
  // a row well inside the title, whatever the edge above it
  const inside = rowColour(img, TITLE.inside)
  // a title bar isn't black (the game's top edge, a masked test frame, is)
  if (inside.even < TITLE.share || Math.max(...inside.mean) < 28) return null
  const isTitle = (y: number) => rowColour(img, y).mean.every((v, c) => Math.abs(v - inside.mean[c]) <= 12)
  // the title's first row: the rows above it are the window's edge
  let start = TITLE.inside
  while (start > 0 && isTitle(start - 1)) start--
  // a row of title text is less even, but still, on average, the title's colour
  let end = TITLE.inside
  while (end + 1 < TITLE.max && isTitle(end + 1)) end++
  if (end - start + 1 < TITLE.min) return null
  // an edge above the title and a border under it, each a line of another colour: a game screen that's evenly
  // dark at the top (a loading screen) has neither
  const differs = (y: number) => rowColour(img, y).mean.some((v, c) => Math.abs(v - inside.mean[c]) > 8)
  if ((start === 0 && !framed) || start > TITLE.edge || !differs(end + 1)) return null
  if (start === 0 && [1, TITLE.inside].some(y => rowColour(img, y, TITLE.flat.near).even < TITLE.flat.share)) return null
  // the edge is `start` rows thick, on every side; the game starts under the title's border, as thick. With no
  // edge to go by, the border is the row under the title when it's a line of one colour (the game's own top
  // row can be one too, so only one)
  let top = end + 1 + start
  if (start === 0 && rowColour(img, top).even >= TITLE.share) top++
  return { x: start, y: top, w: img.width - 2 * start, h: img.height - top - start }
}
