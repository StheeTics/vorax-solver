import { layout } from '@/solver/scan/layout'

const at = (w: number, h: number) => layout({ width: w, height: h })

it('places the six tanks across a 3440x1440 frame as measured', () => {
  const l = at(3440, 1440)
  expect(l.tankCx.map(Math.round)).toEqual([862, 1299, 1736, 2174, 2633, 3106])
})

it('places the three hand cards and the instruments from the right edge', () => {
  const l = at(3440, 1440)
  expect(l.cardArt.map(r => Math.round(r.x + r.w / 2))).toEqual([1630, 1857, 2083])
  expect(l.instrumentIcon.map(r => Math.round(r.x + r.w / 2))).toEqual([3278, 3143, 3008])
})

it('scales with the frame height (same aspect, 0.75x)', () => {
  const big = at(3440, 1440)
  const small = at(2580, 1080)
  expect(small.tankCx[3]).toBeCloseTo(big.tankCx[3] * 0.75, 0)
  expect(small.nameBand[0].h).toBeCloseTo(big.nameBand[0].h * 0.75, 1)
  expect(small.round.x).toBeCloseTo(big.round.x * 0.75, 1)
})

it("places a Potion Kit's five cards, fanned wider and tilted more at the ends", () => {
  const l = at(3440, 1440)
  expect(l.hand5.map(c => Math.round(c.cx))).toEqual([1335, 1557, 1790, 2023, 2235])
  expect(l.hand5[0].angle).toBeLessThan(l.hand5[1].angle)
  expect(l.hand5[2].angle).toBe(0)
  expect(l.hand5[4].angle).toBeGreaterThan(l.hand5[3].angle)
})
