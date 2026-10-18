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

describe('16:9 screens (measured on a real 1920x1080 frame)', () => {
  it('place the six tank labels closer together and higher than the ultrawide does', () => {
    const l = at(1920, 1080)
    expect(l.tankCx.map(Math.round)).toEqual([393, 660, 924, 1188, 1460, 1738])
    expect(l.nameBand[1].y).toBeCloseTo(511 * 0.75, 0)
    expect(l.aqBand[1].y).toBeCloseTo(554 * 0.75, 0)
  })
  it('scales the same at 2560x1440 (also 16:9)', () => {
    const small = at(1920, 1080)
    const big = at(2560, 1440)
    big.tankCx.forEach((x, i) => expect(x).toBeCloseTo(small.tankCx[i] * (4 / 3), 0))
  })
  it('blends between the two profiles for shapes in between, and clamps outside them', () => {
    const wide = at(1920, 1080).tankCx[5] / 1080
    const ultra = at(3440, 1440).tankCx[5] / 1440
    const mid = at(2160, 1080).tankCx[5] / 1080 // 2:1
    expect(mid).toBeGreaterThan(Math.min(wide, ultra) - 5)
    expect(at(1280, 1024).tankCx.map(Math.round)).toEqual(at(1920, 1080).tankCx.map(x => Math.round((x - 960) * (1024 / 1080) + 640)))
  })
})
