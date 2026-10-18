import { frameDiff, thumb, waitStable } from '@/solver/live/stable'

const img = (w: number, h: number, fill: (x: number, y: number) => number) => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = fill(x, y)
    data.set([v, v, v, 255], (y * w + x) * 4)
  }
  return { width: w, height: h, data } as unknown as ImageData
}

it('thumb shrinks a frame to 96 columns of grey', () => {
  const t = thumb(img(960, 400, () => 200))
  expect(t.w).toBe(96)
  expect(t.h).toBe(40)
  expect(t.g[0]).toBeCloseTo(200, 0)
})

it('identical frames differ by 0, a swapped half by a lot', () => {
  const a = thumb(img(960, 400, () => 100))
  expect(frameDiff(a, a)).toBe(0)
  const b = thumb(img(960, 400, x => (x < 480 ? 100 : 200)))
  expect(frameDiff(a, b)).toBeGreaterThan(40)
})

it('a few changed pixels (bubbles, flames) stay under the threshold', () => {
  const a = thumb(img(960, 400, () => 100))
  const b = thumb(img(960, 400, (x, y) => (x < 20 && y < 20 ? 255 : 100)))
  expect(frameDiff(a, b)).toBeLessThan(1)
})

it('waitStable returns once three grabs in a row match', async () => {
  const frames = [img(96, 40, () => 0), img(96, 40, () => 0), img(96, 40, () => 120), img(96, 40, () => 200), img(96, 40, () => 200), img(96, 40, () => 200)]
  let i = 0
  const grab = vi.fn(async () => frames[Math.min(i++, frames.length - 1)])
  const got = await waitStable(grab, { intervalMs: 0, maxMs: 10_000 })
  expect(grab).toHaveBeenCalledTimes(6)
  expect(got.data[0]).toBe(200)
})

it('a repeated cached frame alone is not enough to call the screen still', async () => {
  const frames = [img(96, 40, () => 10), img(96, 40, () => 10), img(96, 40, () => 90), img(96, 40, () => 90), img(96, 40, () => 90)]
  let i = 0
  const got = await waitStable(async () => frames[Math.min(i++, frames.length - 1)], { intervalMs: 0, maxMs: 10_000 })
  expect(got.data[0]).toBe(90)
})

it('waitStable gives up after maxMs with the latest frame', async () => {
  let i = 0
  const grab = async () => img(96, 40, () => (i++ * 50) % 256)
  let t = 0
  const got = await waitStable(grab, { intervalMs: 0, maxMs: 500, now: () => (t += 200) })
  expect(got).toBeTruthy()
})
