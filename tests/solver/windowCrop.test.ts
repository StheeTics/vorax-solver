import { cropTo } from '@/solver/live/windowCrop'

describe('cutting a picture', () => {
  it('cuts the picture to it', () => {
    const img = { width: 4, height: 3, data: new Uint8ClampedArray(48).map((_, i) => i) }
    const out = cropTo(img, { x: 1, y: 1, w: 2, h: 2 })
    expect([out.width, out.height]).toEqual([2, 2])
    expect([...out.data.slice(0, 4)]).toEqual([20, 21, 22, 23])
  })
})

describe('a windowed game’s title bar, found in the picture (the website and the app alike)', async () => {
  const { readFileSync } = await import('node:fs')
  const { decodePng } = await import('../../scripts/scan/png')
  const { scan } = await import('@/solver/scan/scan')
  const { windowedGame } = await import('@/solver/live/windowCrop')
  const raw = (await import('@/solver/scan/data.json')).default
  const { unpack } = await import('@/solver/scan/data')
  const data = unpack(raw as never)
  const frame = (f: string) => decodePng(readFileSync(`tests/fixtures/frames/${f}`))

  // issue #2: the app, a 1920×1080 game in a window, the picture shrunk to 1866×1080
  it('finds the game under it, and the board then reads as the game shows it', () => {
    const img = frame('windowed-1866.png')
    expect(windowedGame(img)).toEqual({ x: 1, y: 31, w: 1864, h: 1048 })
    const r = scan(cropTo(img, windowedGame(img)!) as never, data)
    expect(r.state.tanks.slice(0, 3).map(t => t && [t.activity, t.quantity])).toEqual([[5, 24], [5, 24], [5, 24]])
    expect(r.state.round).toBe(1)
  })
  // issue #3: the website, 2506×1440
  it('the same on another size', () => {
    const img = frame('windowed-2506.png')
    expect(windowedGame(img)).toEqual({ x: 1, y: 31, w: 2504, h: 1408 })
    const r = scan(cropTo(img, windowedGame(img)!) as never, data)
    expect(r.state.tanks[0]).toEqual({ archetype: 'boneSentry', rarity: 'normal', activity: 57, quantity: 92 })
    expect(r.state.round).toBe(2)
  })
  it('nothing on a game screen that’s evenly dark at the top (a loading screen): no window edge, no border under it', () => {
    const img = { width: 400, height: 300, data: new Uint8ClampedArray(400 * 300 * 4).fill(45) }
    for (let y = 22; y < 300; y++) for (let x = 0; x < 400; x++) img.data.set([45 + (y % 30), 47, 50, 255], (y * 400 + x) * 4)
    expect(windowedGame(img)).toBeNull()
  })
  it('nothing on a borderless or fullscreen picture', () => {
    expect(windowedGame(frame('board-012.png'))).toBeNull()
    expect(windowedGame(frame('board-1080p.png'))).toBeNull()
  })
})
