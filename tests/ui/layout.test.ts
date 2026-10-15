import { stageLayout, placeTooltip } from '@/ui/layout'

describe('stageLayout', () => {
  it('desktop: no rotation, fit inside the window', () => {
    expect(stageLayout(1920, 1080, false)).toEqual({ rotated: false, scale: 1.2 })
    expect(stageLayout(1326, 837, false).rotated).toBe(false)
  })
  it('desktop portrait window still does not rotate', () => {
    expect(stageLayout(800, 1200, false).rotated).toBe(false)
  })
  it('touch portrait: rotate 90° and fill using the long side', () => {
    const l = stageLayout(390, 844, true) // iPhone 13 visible area
    expect(l.rotated).toBe(true)
    expect(l.scale).toBeCloseTo(Math.min(844 / 1600, 390 / 900), 6)
    // the rotated stage (900 wide on screen, 1600 tall) must fit the screen
    expect(900 * l.scale).toBeLessThanOrEqual(390 + 1e-9)
    expect(1600 * l.scale).toBeLessThanOrEqual(844 + 1e-9)
  })
  it('touch landscape: no rotation', () => {
    expect(stageLayout(844, 390, true)).toEqual({ rotated: false, scale: Math.min(844 / 1600, 390 / 900) })
  })
})

describe('placeTooltip (stage coordinates, 1600×900)', () => {
  const size = { width: 300, height: 120 }
  it('opens below the word when there is room', () => {
    const p = placeTooltip({ left: 700, top: 300, width: 60, height: 20 }, size)
    expect(p).toEqual({ left: 580, top: 328, above: false })
  })
  it('flips above the word near the bottom', () => {
    const p = placeTooltip({ left: 700, top: 820, width: 60, height: 20 }, size)
    expect(p.above).toBe(true)
    expect(p.top + size.height).toBeLessThanOrEqual(820 - 8 + 1e-9)
  })
  it('stays inside the stage horizontally', () => {
    expect(placeTooltip({ left: 1580, top: 300, width: 20, height: 20 }, size).left).toBe(1600 - 300 - 8)
    expect(placeTooltip({ left: 2, top: 300, width: 20, height: 20 }, size).left).toBe(8)
  })
})
