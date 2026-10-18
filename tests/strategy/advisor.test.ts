import { advise, toState, type ScreenState } from '@/strategy/advisor'
import { DEFAULT_SETTINGS } from '@/engine/game'
import { settingsForShelley } from '@/data/shelley'

const tank = { archetype: 'pest' as const, rarity: 'magic' as const, activity: 81, quantity: 340 }
const board: ScreenState = {
  tanks: Array.from({ length: 6 }, () => ({ ...tank })),
  hand: ['Mutagenic Powder', 'Green Bile Solution', 'Bewitching Tincture'],
  instruments: [],
  phase: 'potion',
  round: 9,
}

it('advise ranks a potion hand', () => {
  const a = advise(board)
  expect(a.ranking.length).toBeGreaterThan(0)
  expect(a.unknown).toEqual([])
  expect(a.best).toBeDefined()
})

it('the Shelley level picks the settings', () => {
  expect(toState({ ...board, shelley: 1 }, []).settings).toEqual(settingsForShelley(1))
  expect(toState(board, []).settings).toEqual(DEFAULT_SETTINGS)
})

it('unknown names are reported', () => {
  expect(advise({ ...board, hand: ['Not A Card'] }).unknown).toEqual(['Not A Card'])
})

it('a Surgical Protocol pick gets no ranking: it does not change Ultimate Activity', () => {
  const a = advise({ ...board, phase: 'protocol', hand: ['Laser Amputation', 'Laparolithotomy', 'Trepanation'] })
  expect(a.ranking).toEqual([])
  expect(a.unknown).toEqual([])
})
