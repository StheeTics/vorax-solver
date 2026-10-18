// The equipped instruments, from the icons in the top-right panel. They fill from the right, newest on the
// right, so reading stops at the first empty slot. Icons are compared as small grey patterns: two of them
// are grey brains that differ only in their shape (one sits on a tray), which colours can't tell apart.
import type { FieldRead, Rect } from '../types'
import type { ScanData } from './data'
import type { Layout } from './layout'
import { signature, type Img } from './pixels'

const ICON_MIN = 0.85
const ICON_GAP = 0.03

/** An icon as a zero-mean, unit-length 24x24 grey pattern. */
export const iconPattern = (img: Img, r: Rect) => signature(img, r, 24, 24)

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0)

/** Panel icons a player named in this browser (WhichPick), kept under `icon:${name}` beside the named cards. */
export const ICON_PREFIX = 'icon:'

// Cards named in the browser are whole-card pictures, not panel icons, so only the icon: entries take part.
export function readInstruments(img: Img, l: Layout, data: ScanData, local: Record<string, unknown[]> = {}): { names: string[]; fields: Record<string, FieldRead>; ranks: [string, number][][]; known: string[] } {
  const icons: Record<string, number[][]> = { ...data.instrumentIcons }
  for (const [k, vs] of Object.entries(local)) if (k.startsWith(ICON_PREFIX)) icons[k.slice(ICON_PREFIX.length)] = [...(icons[k.slice(ICON_PREFIX.length)] ?? []), ...(vs as number[][])]
  const fromRight: string[] = []
  const reads: FieldRead[] = []
  const ranksFromRight: [string, number][][] = []
  for (const r of l.instrumentIcon) {
    const p = iconPattern(img, r)
    const ranked = Object.entries(icons).map(([n, vs]) => [n, Math.max(...vs.map(v => dot(v, p)))] as [string, number]).sort((a, b) => b[1] - a[1])
    if (ranked[0][0] === 'none') break
    fromRight.push(ranked[0][0])
    ranksFromRight.push(ranked.filter(([n]) => n !== 'none'))
    reads.push({ sure: ranked[0][1] >= ICON_MIN && ranked[0][1] - (ranked[1]?.[1] ?? 0) >= ICON_GAP, guess: ranked[0][0], score: ranked[0][1], second: ranked[1]?.[1] })
  }
  const names = fromRight.reverse()
  const fields: Record<string, FieldRead> = {}
  reads.reverse().forEach((f, i) => (fields[`instrument${i}`] = f))
  return { names, fields, ranks: ranksFromRight.reverse(), known: Object.keys(icons).filter(n => n !== 'none') }
}
