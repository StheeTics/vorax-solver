import { readFileSync } from 'node:fs'
import { highlightBoxes, type Box } from '@/solver/advice/highlight'
import { layout } from '@/solver/scan/layout'
import type { Shown } from '@/solver/advice/useAdvice'
import type { Advice, Ranked } from '@/strategy/advisor'
import type { Rect } from '@/solver/types'

const advice = (best: Advice['best']): Advice => ({ best, ranking: best && best !== 'refresh' ? [best] : [], board: 0, plan: true, final: true, ms: 0, unknown: [] })
const play = (index: number, targets: number[] = []): Ranked => ({ index, targets, value: 1 })
const shown = (best: Advice['best'], hand = ['A', 'B', 'C'], phase: 'potion' | 'instrument' | 'protocol' = 'potion'): Shown => ({
  board: { tanks: [null, null, null, null, null, null], hand, instruments: [], phase },
  advice: advice(best),
})
const FRAME = { width: 3440, height: 1440 }
const ready = { updating: false, held: false }

/** a box back in the frame's pixels */
const px = (b: Box, f = FRAME): Rect => ({ x: b.x * f.width, y: b.y * f.height, w: b.w * f.width, h: b.h * f.height })
const holds = (outer: Rect, inner: Rect) => outer.x <= inner.x && outer.y <= inner.y && outer.x + outer.w >= inner.x + inner.w && outer.y + outer.h >= inner.y + inner.h
const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

it('boxes the advised card, as a square box around its face', () => {
  const boxes = highlightBoxes(shown(play(1)), FRAME, undefined, ready)
  expect(boxes).toHaveLength(1)
  const l = layout(FRAME)
  const card = px(boxes[0])
  // around the middle card's art, and centred on it
  expect(holds(card, l.cardArt[1])).toBe(true)
  expect(Math.abs(centre(card).x - centre(l.cardArt[1]).x)).toBeLessThan(15)
  expect(card.w).toBeLessThan(l.cardArt[2].x - l.cardArt[0].x)
})

it('boxes each target tank, around its labels', () => {
  const boxes = highlightBoxes(shown(play(0, [1, 4])), FRAME, undefined, ready)
  expect(boxes).toHaveLength(3)
  const l = layout(FRAME)
  const [, a, b] = boxes.map(b => px(b))
  for (const [box, t] of [[a, 1], [b, 4]] as const) {
    // the labels' text, under the jar
    expect(box.x).toBeLessThan(l.tankCx[t] - 60)
    expect(box.x + box.w).toBeGreaterThan(l.tankCx[t] + 60)
    expect(box.y + box.h).toBeGreaterThan(l.aqBand[t].y + l.aqBand[t].h)
    // the jar above them: most of the screen's top half
    expect(box.y).toBeLessThan(FRAME.height * 0.1)
  }
  // neighbouring tanks' boxes don't overlap
  const all = highlightBoxes(shown(play(0, [0, 1, 2, 3, 4, 5])), FRAME, undefined, ready).slice(1).map(b => px(b))
  for (let i = 1; i < all.length; i++) expect(all[i].x).toBeGreaterThan(all[i - 1].x + all[i - 1].w)
})

it('boxes a Potion Kit’s card in its five-card hand', () => {
  const boxes = highlightBoxes(shown(play(4), ['A', 'B', 'C', 'D', 'E']), FRAME, undefined, ready)
  const l = layout(FRAME)
  expect(Math.abs(centre(px(boxes[0])).x - l.hand5[4].cx)).toBeLessThan(15)
})

it('boxes the Refresh button when the advice is to refresh', () => {
  const boxes = highlightBoxes(shown('refresh'), FRAME, undefined, ready)
  expect(boxes).toHaveLength(1)
  const b = px(boxes[0])
  // right of centre, at the bottom, where the dice and the count are
  expect(b.x).toBeGreaterThan(FRAME.width / 2)
  expect(b.y).toBeGreaterThan(FRAME.height * 0.9)
})

it('is the same picture fractions on a 16:9 screen, scaled by the interface', () => {
  const f = { width: 1920, height: 1080 }
  const l = layout(f)
  const [card, tank] = highlightBoxes(shown(play(2, [3])), f, undefined, ready).map(b => px(b, f))
  expect(holds(card, l.cardArt[2])).toBe(true)
  expect(tank.x).toBeLessThan(l.tankCx[3] - 40)
  expect(tank.x + tank.w).toBeGreaterThan(l.tankCx[3] + 40)
  // a larger interface scale: larger cards, the tanks stay put
  const [big, bigTank] = highlightBoxes(shown(play(2, [3])), f, 1.25, ready).map(b => px(b, f))
  expect(big.w).toBeGreaterThan(card.w * 1.2)
  expect(bigTank.w).toBeCloseTo(tank.w, 0)
})

it('every box stays inside the picture', () => {
  for (const f of [FRAME, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }])
    for (const b of highlightBoxes(shown(play(0, [0, 1, 2, 3, 4, 5])), f, undefined, ready))
      expect(b.x >= 0 && b.y >= 0 && b.x + b.w <= 1 && b.y + b.h <= 1).toBe(true)
})

it('nothing while the advice may not be for the screen, or there is nothing to point at', () => {
  const s = shown(play(1, [2]))
  expect(highlightBoxes(s, FRAME, undefined, { updating: true, held: false })).toEqual([])
  expect(highlightBoxes(s, FRAME, undefined, { updating: false, held: true })).toEqual([])
  expect(highlightBoxes(null, FRAME, undefined, ready)).toEqual([])
  expect(highlightBoxes(s, undefined, undefined, ready)).toEqual([])
  expect(highlightBoxes(shown(null), FRAME, undefined, ready)).toEqual([])
  expect(highlightBoxes(shown(play(0), ['A', 'B', 'C'], 'protocol'), FRAME, undefined, ready)).toEqual([])
  // a card place the screen doesn't have
  expect(highlightBoxes(shown(play(3)), FRAME, undefined, ready)).toEqual([])
})

it('the app lets through only boxes inside the picture, and at most seven', async () => {
  const { createRequire } = await import('node:module')
  const { cleanBoxes } = createRequire(import.meta.url)('../../desktop/lib/boxes.js') as { cleanBoxes(b: unknown): Box[] }
  const boxes = highlightBoxes(shown(play(0, [0, 1, 2, 3, 4, 5])), FRAME, undefined, ready)
  expect(cleanBoxes(boxes)).toEqual(boxes)
  expect(cleanBoxes([{ x: 0.1, y: 0.1, w: 0.2, h: 0.2, extra: '<b>' }])).toEqual([{ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }])
  expect(cleanBoxes([{ x: -1, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.9, h: 0.1 }, { x: 'a' }, null])).toEqual([])
  expect(cleanBoxes(Array(9).fill({ x: 0, y: 0, w: 0.1, h: 0.1 }))).toHaveLength(7)
  expect(cleanBoxes('no')).toEqual([])
})

it('the page tells the app, which apps from 0.1.11 on draw', () => {
  const preload = readFileSync('desktop/preload.js', 'utf8')
  expect(preload).toMatch(/showHighlights: \(boxes\) => ipcRenderer\.send\('highlights', boxes\)/)
})
