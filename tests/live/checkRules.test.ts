import { pairs } from '../../scripts/live/checkRules'

const board = (seq: number, round: number, unsure?: string[]) => ({
  run: 'r', seq, round, phase: 'potion' as const, refreshes: 0, hand: ['Xeno-Hormone', 'Mutagenic Powder', 'Green Bile Solution'], instruments: [],
  tanks: [{ archetype: 'pest' as const, rarity: 'magic' as const, activity: 5, quantity: 24 }, null, null, null, null, null], ...(unsure ? { unsure } : {}),
})

it('pairs a potion board with the next round’s', () => {
  expect(pairs([board(0, 2), board(1, 3)])).toHaveLength(1)
})

it('leaves out a pair with anything unsure on either board: a misread would look like a wrong card effect', () => {
  expect(pairs([board(0, 2, ['tank0.activity']), board(1, 3)])).toHaveLength(0)
  expect(pairs([board(0, 2), board(1, 3, ['hand2'])])).toHaveLength(0)
  expect(pairs([board(0, 2, []), board(1, 3, [])])).toHaveLength(1)
})
