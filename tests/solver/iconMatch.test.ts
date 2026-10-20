import { iconSimilarity } from '@/solver/scan/iconMatch'
import { unpack, type PackedScanData } from '@/solver/scan/data'
import data from '@/solver/scan/data.json'

const icons = unpack(data as unknown as PackedScanData).instrumentIcons
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0)
/** p moved dx right and dy down, the background coming in at the edges, as a zero-mean unit-length pattern again */
const move = (p: number[], dx: number, dy: number) => {
  const bg = Math.min(...p)
  const q = p.map((_, i) => { const x = (i % 24) - dx, y = Math.floor(i / 24) - dy; return x >= 0 && x < 24 && y >= 0 && y < 24 ? p[y * 24 + x] : bg })
  const m = q.reduce((s, v) => s + v, 0) / q.length, c = q.map(v => v - m), n = Math.hypot(...c)
  return c.map(v => v / n)
}

describe('icons compared even when the panel crop lands a few pixels off', () => {
  const nail = icons['Canine Teeth File'][0], sac = icons['Incubation Sac'][0]
  it('an icon matches itself', () => {
    expect(iconSimilarity(nail, nail)).toBeCloseTo(1, 1)
  })
  it('an icon moved 5 pixels sideways and 2 down still matches itself well (compared in place it doesn’t)', () => {
    const off = move(sac, 5, 2)
    expect(dot(sac, off)).toBeLessThan(0.6)
    expect(iconSimilarity(sac, off)).toBeGreaterThan(0.9)
  })
  it('two different instruments still score low', () => {
    expect(iconSimilarity(nail, sac)).toBeLessThan(0.6)
    expect(iconSimilarity(sac, move(nail, -4, 0))).toBeLessThan(0.6)
  })
})
