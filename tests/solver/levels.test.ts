import { readFileSync } from 'node:fs'
import { decodePng } from '../../scripts/scan/png'
import { scan } from '@/solver/scan/scan'
import { levels, matchLevels } from '@/solver/scan/levels'
import type { Img } from '@/solver/scan/pixels'
import raw from '@/solver/scan/data.json'
import { unpack, type PackedScanData } from '@/solver/scan/data'
import type { Label } from '../../scripts/scan/buildData'

const data = unpack(raw as unknown as PackedScanData)
const truth = JSON.parse(readFileSync('scripts/scan/truth.json', 'utf8')) as Record<string, Label>

/** A frame with every channel passed through f, as another PC's capture might show it. */
function recolour(img: Img, f: (x: number) => number, saturation = 1): Img {
  const d = new Uint8ClampedArray(img.data)
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [f(d[i]), f(d[i + 1]), f(d[i + 2])]
    const l = 0.299 * r + 0.587 * g + 0.114 * b
    d[i] = l + saturation * (r - l)
    d[i + 1] = l + saturation * (g - l)
    d[i + 2] = l + saturation * (b - l)
  }
  return { width: img.width, height: img.height, data: d }
}

const board = decodePng(readFileSync('tests/fixtures/frames/board-012.png'))

describe('a frame captured with other colours (HDR, gamma) reads as the true colours do', () => {
  const setups: [string, (x: number) => number, number?][] = [
    // SDR shown through Windows HDR and captured: lifted blacks, flatter contrast, paler colours
    ['HDR washed out', x => 35 + 0.8 * x, 0.8],
    // the other HDR capture fault: too bright and clipped
    ['HDR blown out', x => 1.2 * 255 * (x / 255) ** 0.7],
    ['a brighter gamma', x => 255 * (x / 255) ** 0.75],
    ['a darker gamma', x => 255 * (x / 255) ** 1.3],
  ]
  for (const [name, f, s] of setups) {
    it(name, () => {
      const r = scan(recolour(board, f, s), data)
      expect(r.state).toEqual(truth['012-board.png'].state)
    })
  }
})

describe('levels', () => {
  const ramp: Img = { width: 256, height: 1, data: new Uint8ClampedArray(256 * 4).map((_, i) => (i % 4 === 3 ? 255 : i >> 2)) }

  it('are the share of channel values at or below each level', () => {
    const q = levels(ramp)
    expect(q).toHaveLength(256)
    expect(q[127]).toBeCloseTo(0.5)
    expect(q[255]).toBe(1)
    expect([...q].sort((a, b) => a - b)).toEqual(q)
  })

  it('matching a frame to its own levels leaves it as it was', () => {
    const out = matchLevels(board, levels(board)).data
    let off = 0
    for (let i = 0; i < out.length; i++) off = Math.max(off, Math.abs(out[i] - board.data[i]))
    expect(off).toBeLessThanOrEqual(1)
  })

  it('matching undoes a brightness change, with one curve for all channels so hues stay', () => {
    const dim = recolour(ramp, x => x * 0.5)
    const back = matchLevels(dim, levels(ramp))
    for (let x = 0; x < 256; x += 51) expect(Math.abs(back.data[x * 4] - x)).toBeLessThanOrEqual(2)
    const pale = { width: 1, height: 1, data: new Uint8ClampedArray([100, 150, 200, 255]) }
    const out = matchLevels(pale, levels(ramp))
    expect(out.data[0] < out.data[1] && out.data[1] < out.data[2]).toBe(true)
  })
})

describe('what the reader saw, for finding out why a setup misreads', () => {
  const r = scan(board, data)
  it('how far the colours were from normal, and that a normal capture is left as it is', () => {
    expect(r.debug!.off).toBeLessThan(0.12)
    expect(r.debug!.corrected).toBe(false)
  })
  it('a recoloured capture is corrected, and says how far off it was', () => {
    const d = scan(recolour(board, x => 35 + 0.8 * x, 0.8), data).debug!
    expect(d.off).toBeGreaterThan(0.12)
    expect(d.corrected).toBe(true)
  })
  it('each filled tank’s number lines as read, before any fixing, and its name’s colour', () => {
    const t = r.debug!.tanks
    expect(t[0]).toBeNull()
    expect(t[1]).toMatchObject({ total: '112320', aq: '416x270' })
    expect(t[1]!.rgb).toHaveLength(3)
    expect(t[3]).toMatchObject({ total: '7616', aq: '112x68' })
  })
})
