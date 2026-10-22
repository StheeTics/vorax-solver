import { finalScore } from '@/engine/final'

const m = (activity: number, quantity: number) => ({ archetype: 'agito' as const, rarity: 'magic' as const, activity, quantity })

describe('the final score from the round-13 board', () => {
  it('without instruments it is the board', () => {
    expect(finalScore([m(100, 100), null, null, null, null, null], [])).toBe(10_000)
  })
  it('end-of-round instruments fire once more when round 13 ends', () => {
    // Canine Teeth File: +30 Quantity to monsters with Activity above 255
    expect(finalScore([m(300, 100), null, null, null, null, null], ['Canine Teeth File'])).toBe(300 * 130)
  })
  it('Lady of the Plague Quarter fires only when its two rounds land on 13', () => {
    const board = [m(100, 100), null, null, null, null, null]
    expect(finalScore(board, ['Lady of the Plague Quarter'], [11])).not.toBe(10_000)
    expect(finalScore(board, ['Lady of the Plague Quarter'], [12])).toBe(10_000)
  })
})
