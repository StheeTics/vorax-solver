import { glyphs, brightest } from '@/solver/scan/text'
import type { Img } from '@/solver/scan/pixels'

const canvas = (w: number, h: number, bg: [number, number, number]): Img => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) data.set([...bg, 255], i * 4)
  return { width: w, height: h, data }
}
const fill = (img: Img, x: number, y: number, w: number, h: number, c: [number, number, number]) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) img.data.set([...c, 255], (j * img.width + i) * 4)
}

it('cuts a line into glyphs left to right, skipping red hearts', () => {
  const img = canvas(80, 20, [30, 25, 25])
  fill(img, 2, 4, 8, 12, [220, 30, 40]) // heart
  fill(img, 20, 4, 5, 12, [170, 150, 125]) // digit
  fill(img, 30, 4, 6, 12, [170, 150, 125]) // digit
  fill(img, 45, 8, 4, 6, [170, 150, 125]) // small x
  const g = glyphs(img, { x: 0, y: 0, w: 80, h: 20 }, 'label')
  expect(g.map(b => b.x)).toEqual([20, 30, 45])
})

it('a glyph with a hole (a 0) is one glyph', () => {
  const img = canvas(40, 20, [20, 20, 20])
  fill(img, 10, 4, 2, 12, [200, 200, 200])
  fill(img, 14, 4, 2, 12, [200, 200, 200])
  fill(img, 12, 4, 2, 1, [200, 200, 200])
  fill(img, 12, 15, 2, 1, [200, 200, 200])
  expect(glyphs(img, { x: 0, y: 0, w: 40, h: 20 }, 'label')).toEqual([{ x: 10, y: 4, w: 6, h: 12 }])
})

it('brightest gives the mean colour of the top 5% of pixels', () => {
  const img = canvas(20, 20, [10, 10, 10])
  fill(img, 0, 0, 20, 1, [100, 150, 200])
  expect(brightest(img, { x: 0, y: 0, w: 20, h: 20 })).toEqual([100, 150, 200])
})

it('two touching digits are split at their thinnest column', () => {
  const img = canvas(60, 20, [20, 20, 20])
  fill(img, 5, 4, 7, 12, [200, 200, 200])
  fill(img, 16, 4, 7, 12, [200, 200, 200])
  fill(img, 23, 9, 1, 2, [200, 200, 200]) // a bridge
  fill(img, 24, 4, 7, 12, [200, 200, 200])
  expect(glyphs(img, { x: 0, y: 0, w: 60, h: 20 }, 'label').map(g => g.x)).toEqual([5, 16, 24])
})

it('two touching wide digits (like 44) split into two, with no sliver left over', () => {
  const img = canvas(60, 20, [20, 20, 20])
  fill(img, 5, 4, 9, 12, [200, 200, 200])
  fill(img, 14, 9, 1, 2, [200, 200, 200]) // a bridge
  fill(img, 15, 4, 9, 12, [200, 200, 200])
  expect(glyphs(img, { x: 0, y: 0, w: 60, h: 20 }, 'label')).toHaveLength(2)
})
