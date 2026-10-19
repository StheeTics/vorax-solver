import { gameArea, cropTo } from '@/solver/live/windowCrop'

describe('where the game is inside a captured window (Vorax Overlay knows the window and its picture)', () => {
  it('borderless or fullscreen: the whole capture', () => {
    expect(gameArea({ width: 2560, height: 1440 }, { outer: [2560, 1440], client: [2560, 1440], scale: 1 })).toBeNull()
  })
  it('windowed, the capture shrunk to fit (seen: 1866×1080 of a 1936×1119 window, the game 1920×1080)', () => {
    const r = gameArea({ width: 1866, height: 1080 }, { outer: [1936, 1119], client: [1920, 1080], scale: 1 })!
    expect(r.x).toBeCloseTo(7.7, 0)
    expect(r.y).toBeCloseTo(29.9, 0)
    expect(r.w).toBeCloseTo(1850.6, 0)
    expect(r.h).toBeCloseTo(1042.3, 0)
  })
  it('windowed at full size (seen: 1920×1080 of a 1936×1096 window, the game 1920×1057)', () => {
    const r = gameArea({ width: 1920, height: 1080 }, { outer: [1936, 1096], client: [1920, 1057], scale: 1 })!
    expect(r.y).toBeCloseTo(30.5, 0)
    expect(r.h).toBeCloseTo(1041.6, 0)
  })
  it('a window size that makes no sense is left alone', () => {
    expect(gameArea({ width: 1920, height: 1080 }, { outer: [100, 100], client: [1920, 1080], scale: 1 })).toBeNull()
  })
  it('cuts the picture to it', () => {
    const img = { width: 4, height: 3, data: new Uint8ClampedArray(48).map((_, i) => i) }
    const out = cropTo(img, { x: 1, y: 1, w: 2, h: 2 })
    expect([out.width, out.height]).toEqual([2, 2])
    expect([...out.data.slice(0, 4)]).toEqual([20, 21, 22, 23])
  })
})
