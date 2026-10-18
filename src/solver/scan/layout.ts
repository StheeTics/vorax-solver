// Where each part of the Surgical Preparation screen sits. Measured on 3440x1440 frames (21:9) from a live
// game, in pixels of that frame, and placed on other frames by scaling with the height from the anchor the
// game's UI uses: the left or right edge, or the centre. The tanks are part of the 3D scene, which for now
// is placed the same way; other aspect ratios need frames of their own to check it.
import type { Rect } from '../types'

const REF_H = 1440

/** Reference rects, x relative to the frame centre unless noted. */
/** Label centres under the six tanks; perspective pushes the right-hand ones further out. */
const TANK_X = [-858, -421, 16, 454, 913, 1386]
const LABEL_HALF_W = 200
const NAME_Y = [556, 577]
const TOTAL_Y = [578, 600]
const AQ_Y = [599, 619]
const ICON = { y: 533, size: 26 }

const CARD_X0 = -90
const CARD_PITCH = 226.5
const CARD_ART = { y: 975, w: 100, h: 120 }
const CARD_FACE = { y: 960, w: 230, h: 340 }
/** The hand is fanned: each card's centre and tilt (radians), measured from the cards' edges. */
const CARD_CY = 1130
const CARD_TILT = [-0.0576, 0, 0.0506]
/** The fan's arc: the side cards sit a little lower and further out than the middle one. */
const CARD_SHIFT = [{ x: 6, y: 6 }, { x: 0, y: 0 }, { x: -6, y: 6 }]
/** A Potion Kit opens to five cards, fanned wider: centres from the frame centre, heights and tilts. */
const HAND5 = { x: [-385, -163, 70, 303, 515], y: [1141, 1121, 1111, 1121, 1141], tilt: [-0.11, -0.06, 0, 0.05, 0.11] }
/** Art and title in a card's own frame, in reference pixels from its centre. */
export const CARD_LOCAL = { art: { x: -50, y: -155, w: 100, h: 120 }, text: { x: -100, y: -45, w: 185, h: 175 } }
const HEADER = { x: -260, y: 908, w: 560, h: 30 }
const REFRESH = { x: 300, y: 1342, w: 160, h: 40 }

/** From the left edge. */
const ROUND = { x: 105, y: 500, w: 100, h: 70 }

/** From the right edge: icon centres, the newest first. */
const INSTRUMENT = { right: 162, pitch: 135, y: 66, size: 74 }

export interface CardPos { cx: number; cy: number; angle: number }

/** A card's face around its centre, for showing it in "What is this?". */
export const cardFace = (c: CardPos, k: number): Rect => ({ x: c.cx - (CARD_FACE.w / 2) * k, y: c.cy - (CARD_FACE.h / 2) * k, w: CARD_FACE.w * k, h: CARD_FACE.h * k })

export interface Layout {
  width: number
  height: number
  /** pixels per reference pixel */
  k: number
  tankCx: number[]
  icon: Rect[]
  nameBand: Rect[]
  totalBand: Rect[]
  aqBand: Rect[]
  cardArt: Rect[]
  cardFace: Rect[]
  /** each card's centre and tilt, for sampling its art and title straightened */
  cards: CardPos[]
  /** the same for a Potion Kit's five cards */
  hand5: CardPos[]
  header: Rect
  refresh: Rect
  round: Rect
  /** rightmost slot first */
  instrumentIcon: Rect[]
}

export function layout(frame: { width: number; height: number }): Layout {
  const { width, height } = frame
  const k = height / REF_H
  const cx = width / 2
  const band = (x: number, y: [number, number] | number[]) => ({ x: x - LABEL_HALF_W * k, y: y[0] * k, w: 2 * LABEL_HALF_W * k, h: (y[1] - y[0]) * k })
  const tankCx = TANK_X.map(x => cx + x * k)
  const cardCx = [0, 1, 2].map(j => cx + (CARD_X0 + CARD_PITCH * j) * k)
  const instrumentCx = [0, 1, 2].map(j => width - (INSTRUMENT.right + INSTRUMENT.pitch * j) * k)
  return {
    width,
    height,
    k,
    tankCx,
    icon: tankCx.map(x => ({ x: x - (ICON.size / 2) * k, y: (ICON.y - ICON.size / 2) * k, w: ICON.size * k, h: ICON.size * k })),
    nameBand: tankCx.map(x => band(x, NAME_Y)),
    totalBand: tankCx.map(x => band(x, TOTAL_Y)),
    aqBand: tankCx.map(x => band(x, AQ_Y)),
    cardArt: cardCx.map(x => ({ x: x - (CARD_ART.w / 2) * k, y: CARD_ART.y * k, w: CARD_ART.w * k, h: CARD_ART.h * k })),
    cardFace: cardCx.map(x => ({ x: x - (CARD_FACE.w / 2) * k, y: CARD_FACE.y * k, w: CARD_FACE.w * k, h: CARD_FACE.h * k })),
    cards: cardCx.map((x, j) => ({ cx: x + CARD_SHIFT[j].x * k, cy: (CARD_CY + CARD_SHIFT[j].y) * k, angle: CARD_TILT[j] })),
    hand5: HAND5.x.map((x, j) => ({ cx: cx + x * k, cy: HAND5.y[j] * k, angle: HAND5.tilt[j] })),
    header: { x: cx + HEADER.x * k, y: HEADER.y * k, w: HEADER.w * k, h: HEADER.h * k },
    refresh: { x: cx + REFRESH.x * k, y: REFRESH.y * k, w: REFRESH.w * k, h: REFRESH.h * k },
    round: { x: ROUND.x * k, y: ROUND.y * k, w: ROUND.w * k, h: ROUND.h * k },
    instrumentIcon: instrumentCx.map(x => ({ x: x - (INSTRUMENT.size / 2) * k, y: (INSTRUMENT.y - INSTRUMENT.size / 2) * k, w: INSTRUMENT.size * k, h: INSTRUMENT.size * k })),
  }
}
