// The text reader, remembering what it read: a card's title read early, while the tanks were still settling,
// isn't read again when the settled board is. A title counts as the same only when its picture is the same
// size and its grey levels barely differ, so a different card is always read afresh.
import type { Img } from './pixels'
import type { ReadText } from './titles'

const KEEP = 15
/** mean grey difference, 0-255, under which two title pictures count as the same */
const SAME = 4

const grey = (img: Img) => {
  const g = new Float32Array(img.width * img.height)
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * img.data[i * 4] + 0.587 * img.data[i * 4 + 1] + 0.114 * img.data[i * 4 + 2]
  return g
}
function same(a: { w: number; h: number; g: Float32Array }, b: { w: number; h: number; g: Float32Array }) {
  if (a.w !== b.w || a.h !== b.h) return false
  let s = 0
  for (let i = 0; i < a.g.length; i++) s += Math.abs(a.g[i] - b.g[i])
  return s / a.g.length < SAME
}

export function cachedTextReader(readText: ReadText): ReadText {
  const seen: { w: number; h: number; g: Float32Array; text: Promise<string> }[] = []
  return (img: Img) => {
    const key = { w: img.width, h: img.height, g: grey(img) }
    const hit = seen.find(e => same(e, key))
    if (hit) return hit.text
    const text = readText(img)
    seen.unshift({ ...key, text })
    seen.length = Math.min(seen.length, KEEP)
    // a failed read isn't remembered
    text.catch(() => {
      const i = seen.findIndex(e => e.text === text)
      if (i >= 0) seen.splice(i, 1)
    })
    return text
  }
}
