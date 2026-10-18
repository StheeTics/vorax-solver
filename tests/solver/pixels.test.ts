import { artFeature, blobs, crop, glyphVector, gray, hsv, patch, resize, signature, similarity, type Img } from '@/solver/scan/pixels'

const make = (w: number, h: number, px: (x: number, y: number) => [number, number, number]): Img => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set([...px(x, y), 255], (y * w + x) * 4)
  return { width: w, height: h, data }
}

it('hsv of pure colours', () => {
  expect(hsv(255, 0, 0)).toEqual([0, 1, 1])
  expect(hsv(0, 0, 255)[0]).toBe(240)
  expect(hsv(128, 128, 128)[1]).toBe(0)
})

it('blobs finds two separate white squares with exact boxes', () => {
  const img = make(40, 20, (x, y) => ((x >= 2 && x < 7 && y >= 3 && y < 8) || (x >= 20 && x < 30 && y >= 10 && y < 12) ? [255, 255, 255] : [0, 0, 0]))
  const found = blobs(img, { x: 0, y: 0, w: 40, h: 20 }, (r) => r > 128)
  expect(found).toEqual([{ x: 2, y: 3, w: 5, h: 5 }, { x: 20, y: 10, w: 10, h: 2 }])
})

it('crop takes the exact pixels', () => {
  const img = make(10, 10, (x, y) => [x * 10, y * 10, 0])
  const c = crop(img, { x: 3, y: 4, w: 2, h: 2 })
  expect([c.width, c.height, c.data[0], c.data[1]]).toEqual([2, 2, 30, 40])
})

it('a glyph looks the same at 1x and 2x', () => {
  const glyph = (s: number) => make(20 * s, 30 * s, (x, y) => {
    const X = x / s, Y = y / s
    return (X > 4 && X < 8 && Y > 3 && Y < 27) || (Y > 3 && Y < 7 && X > 4 && X < 16) ? [255, 255, 255] : [0, 0, 0]
  })
  const a = glyphVector(gray(glyph(1)), 20, 30, { x: 0, y: 0, w: 20, h: 30 }, 30)
  const big = resize(glyph(1), 40, 60)
  const b = glyphVector(gray(big), 40, 60, { x: 0, y: 0, w: 40, h: 60 }, 60)
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  expect(a.length).toBe(192)
  expect(dot).toBeGreaterThan(0.95)
})

it('art similarity is 1 for the same picture and low for its inverse', () => {
  const img = make(32, 32, (x, y) => [x * 8, y * 8, (x * y) % 255])
  const inv = make(32, 32, (x, y) => [255 - x * 8, 255 - y * 8, 255 - ((x * y) % 255)])
  const r = { x: 0, y: 0, w: 32, h: 32 }
  expect(similarity(artFeature(img, r), artFeature(img, r))).toBeCloseTo(1, 6)
  expect(similarity(artFeature(img, r), artFeature(inv, r))).toBeLessThan(0.6)
})

it('a signature is unit length and the same for the same picture', () => {
  const img = make(64, 16, (x, y) => [(x * 4) % 256, y * 10, 50])
  const a = signature(img, { x: 0, y: 0, w: 64, h: 16 })
  expect(a).toHaveLength(48 * 8)
  expect(Math.hypot(...a)).toBeCloseTo(1, 6)
  const b = signature(img, { x: 0, y: 0, w: 64, h: 16 })
  expect(a.reduce((s, v, i) => s + v * b[i], 0)).toBeCloseTo(1, 6)
})

it('a rotated patch straightens a tilted picture', () => {
  // a horizontal bar, tilted by +5 degrees about (50, 50)
  const t = (5 * Math.PI) / 180
  const img = make(100, 100, (x, y) => {
    const u = (x - 50) * Math.cos(t) + (y - 50) * Math.sin(t)
    const v = -(x - 50) * Math.sin(t) + (y - 50) * Math.cos(t)
    return Math.abs(v) < 3 && Math.abs(u) < 40 ? [255, 255, 255] : [0, 0, 0]
  })
  const p = patch(img, 50, 50, t, { x: -40, y: -10, w: 80, h: 20 })
  const row = (y: number) => Array.from({ length: 80 }, (_, x) => p.data[(y * 80 + x) * 4]).filter(v => v > 128).length
  expect(row(10)).toBeGreaterThan(70)
  expect(row(2)).toBe(0)
  expect(row(18)).toBe(0)
})
