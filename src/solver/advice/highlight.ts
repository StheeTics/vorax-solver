// Green boxes over the game for the advised move (Vorax Overlay draws them, apps from 0.1.11 on): around the
// card to play or take and the tanks it targets, or the Refresh button. Square boxes, as fractions of the game
// picture the Solver read, so the app only has to lay them over the game window's picture.
import { cardFace, layout } from '../scan/layout'
import { handAt } from '../scan/cards'
import type { Rect } from '../types'
import type { Shown } from './useAdvice'

/** x, y, w, h from 0 to 1 of the game picture */
export type Box = Rect

/** The boxes for the advice on screen, or none. updating: a newer board is being worked out; held: the move
 *  isn't shown as such (the Solver is paused, the advice is unreliable, or it depends on an unconfirmed pick).
 *  Either way the boxes could point at the wrong thing, so none are drawn. */
export function highlightBoxes(shown: Shown | null, frame: { width: number; height: number } | undefined, ui: number | undefined, { updating, held }: { updating: boolean; held: boolean }): Box[] {
  if (!shown || !frame || updating || held) return []
  const { advice, board } = shown
  if (board.phase === 'protocol' || !advice.best) return []
  const l = layout(frame, ui ?? 1)
  const rects: Rect[] = []
  if (advice.best === 'refresh') rects.push(l.refreshButton)
  else {
    const card = handAt(l, board.hand.length)[advice.best.index]
    if (!card || advice.best.index >= board.hand.length) return []
    rects.push(cardFace(card, l.k))
    for (const t of advice.best.targets) if (l.tank[t]) rects.push(l.tank[t])
  }
  return rects.map(r => fraction(r, frame))
}

/** a rect in the picture's pixels as fractions of it, kept inside it */
function fraction(r: Rect, { width, height }: { width: number; height: number }): Box {
  const x0 = Math.max(0, r.x), y0 = Math.max(0, r.y)
  const x1 = Math.min(width, r.x + r.w), y1 = Math.min(height, r.y + r.h)
  return { x: x0 / width, y: y0 / height, w: Math.max(0, x1 - x0) / width, h: Math.max(0, y1 - y0) / height }
}
