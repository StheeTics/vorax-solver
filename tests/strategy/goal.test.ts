import { goalScore, TARGET } from '@/strategy/bot'

describe('scoring a playout by the goal: the score counted up to 840,000', () => {
  it('840,000 is the target, treated as rainbow: the endgame battle bonus takes it the rest of the way', () => {
    expect(TARGET).toBe(840_000)
  })
  it('every point counts below the target', () => {
    expect(goalScore(800_000)).toBeGreaterThan(goalScore(750_000))
    expect(goalScore(400_000)).toBe(400_000)
  })
  it('nothing above the target counts', () => {
    expect(goalScore(TARGET)).toBe(goalScore(3_000_000))
  })
})
