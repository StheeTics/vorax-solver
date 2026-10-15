import { instrumentRefreshesFor, settingsForShelley, POTION_REFRESHES, SHELLEY_LEVELS } from '@/data/shelley'

it('Intern Shelley levels 1–6 give +0/+1/+1/+2/+2/+2 instrument refreshes', () => {
  expect(SHELLEY_LEVELS).toEqual([1, 2, 3, 4, 5, 6])
  expect(SHELLEY_LEVELS.map(instrumentRefreshesFor)).toEqual([0, 1, 1, 2, 2, 2])
})

it('potion refreshes are always 3, at every level', () => {
  expect(POTION_REFRESHES).toBe(3)
  for (const l of SHELLEY_LEVELS) expect(settingsForShelley(l).potionRefreshes).toBe(3)
  expect(settingsForShelley(4)).toEqual({ potionRefreshes: 3, instrumentRefreshes: 2 })
})
