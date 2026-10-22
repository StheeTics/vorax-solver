import { carriedRound } from '@/solver/live/round'

const potion = (round: number) => ({ round, phase: 'potion' })

describe('the round when its number can’t be read', () => {
  it('a round read for sure is used as read', () => {
    expect(carriedRound(potion(5), { round: 9, phase: 'potion', sure: true })).toBe(9)
  })
  it('carries over the round before, never round 1 in the middle of a game', () => {
    expect(carriedRound(potion(6), { round: 1, phase: 'potion', sure: false })).toBe(6)
    expect(carriedRound({ round: 6, phase: 'instrument' }, { round: 1, phase: 'instrument', sure: false, guess: '' })).toBe(6)
  })
  it('takes the reader’s guess when it is that round or the next', () => {
    expect(carriedRound(potion(6), { round: 1, phase: 'potion', sure: false, guess: '7' })).toBe(7)
    expect(carriedRound(potion(6), { round: 1, phase: 'potion', sure: false, guess: '1' })).toBe(6)
    expect(carriedRound(potion(6), { round: 1, phase: 'potion', sure: false, guess: '9' })).toBe(6)
  })
  it('a Surgical Protocol is round 11 or later', () => {
    expect(carriedRound(potion(10), { round: 1, phase: 'protocol', sure: false })).toBe(11)
    expect(carriedRound({ round: 12, phase: 'protocol' }, { round: 1, phase: 'protocol', sure: false })).toBe(12)
  })
  it('a card after the protocols is a new game, and with nothing before it is round 1', () => {
    expect(carriedRound({ round: 13, phase: 'protocol' }, { round: 1, phase: 'instrument', sure: false })).toBe(1)
    expect(carriedRound(null, { round: 1, phase: 'potion', sure: false })).toBe(1)
  })
})
