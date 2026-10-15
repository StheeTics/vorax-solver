import { createRng, stubRng } from '@/engine/rng'

describe('createRng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng(42), b = createRng(42)
    const xs = Array.from({ length: 5 }, () => a.next())
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(xs)
    xs.forEach(x => { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1) })
  })

  it('resumes from state()', () => {
    const r = createRng(7)
    r.next(); r.next()
    const resumed = createRng(r.state())
    expect([resumed.next(), resumed.next()]).toEqual([r.next(), r.next()])
  })

  it('shuffle keeps elements and is unbiased', () => {
    const r = createRng(1)
    expect(r.shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4])
    const counts: Record<string, number> = {}
    const N = 10000
    for (let i = 0; i < N; i++) {
      const k = r.shuffle([0, 1, 2]).join('')
      counts[k] = (counts[k] ?? 0) + 1
    }
    expect(Object.keys(counts)).toHaveLength(6)
    for (const c of Object.values(counts)) expect(Math.abs(c / N - 1 / 6)).toBeLessThan((1 / 6) * 0.15)
  })

  it('sample caps at array length', () => {
    expect(createRng(3).sample([1, 2, 3], 5)).toHaveLength(3)
  })
})

describe('stubRng', () => {
  it('with [0] succeeds chances and picks first', () => {
    const r = stubRng([0])
    expect(r.chance(0.5)).toBe(true)
    expect(r.int(4)).toBe(0)
    expect(r.pick(['a', 'b'])).toBe('a')
  })
})
