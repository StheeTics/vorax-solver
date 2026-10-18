import { INSTRUMENTS } from '@/data/instruments'
import { PRIOR } from '@/strategy/bot'
import { measureStrength } from '../../scripts/sim/strength'

it('every instrument has a strength for the picks inside playouts', () => {
  for (const d of INSTRUMENTS) expect(PRIOR[d.id], d.name).toBeGreaterThan(0)
})

it('measures an instrument by the goal score of games built around it (0-100)', () => {
  const v = measureStrength('Prismatic Liver', 2, 1)
  expect(v).toBeGreaterThan(0)
  expect(v).toBeLessThanOrEqual(100)
})

it('the same games give the same strength', () => {
  expect(measureStrength('Sinew Garrote', 2, 7)).toBe(measureStrength('Sinew Garrote', 2, 7))
})
