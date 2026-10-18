import { proposeWeights } from '../../scripts/live/propose'
import { LIVE_WEIGHTS } from '@/data/liveWeights'
import type { Rates, Rate } from '../../scripts/live/rates'

// the even odds the engine started from: these tests are about how proposals move weights, not today's weights
const EVEN = {
  ...LIVE_WEIGHTS,
  supremeChance: 0.01,
  potionOffer: Object.fromEntries(Object.keys(LIVE_WEIGHTS.potionOffer).map(n => [n, 1])),
  instrumentOffer: { basic: Object.fromEntries(Object.keys(LIVE_WEIGHTS.instrumentOffer.basic).map(n => [n, 1])), advanced: Object.fromEntries(Object.keys(LIVE_WEIGHTS.instrumentOffer.advanced).map(n => [n, 1])) },
}

const r = (count: number, n: number, engine: number, lo: number, hi: number): Rate => ({ count, n, p: count / n, lo, hi, engine })
const empty = (): Rates => ({ generated: '', boards: 0, runs: 0, potionOffer: {}, boxOffer: {}, supreme: r(0, 0, 0.01, 0, 1), instrumentOffer: { basic: {}, advanced: {} }, spawnRarity: {}, spawnArchetype: {} })

it('no change below 30 observations', () => {
  const rates = { ...empty(), supreme: r(9, 29, 0.01, 0.15, 0.5) }
  expect(proposeWeights(EVEN, rates).changes).toEqual([])
})

it('no change while the 95% range still includes the current value', () => {
  const rates = { ...empty(), supreme: r(1, 100, 0.01, 0.002, 0.05) }
  expect(proposeWeights(EVEN, rates).changes).toEqual([])
})

it('a jump is capped at 2x per update', () => {
  const rates = { ...empty(), supreme: r(50, 1000, 0.01, 0.04, 0.06) }
  const { next, changes } = proposeWeights(EVEN, rates)
  expect(next.supremeChance).toBeCloseTo(0.02, 6)
  expect(changes).toEqual(['supremeChance 0.01 → 0.02 (live 5.0% of 1000)'])
})

it('a weight at zero can grow to the floor', () => {
  const current = { ...EVEN, supremeChance: 0 }
  const rates = { ...empty(), supreme: r(30, 1000, 0, 0.02, 0.04) }
  expect(proposeWeights(current, rates).next.supremeChance).toBeCloseTo(0.002, 6)
})

it('a potion offered more than its share gains weight, shares kept summing to the same total', () => {
  const names = Object.keys(EVEN.potionOffer)
  const share = 0.99 / names.filter(n => EVEN.potionOffer[n] > 0).length
  const rates = { ...empty(), potionOffer: { [names[0]]: r(200, 1000, share, 0.18, 0.22) } }
  const { next, changes } = proposeWeights(EVEN, rates)
  expect(next.potionOffer[names[0]]).toBeCloseTo(2, 6)
  expect(changes).toHaveLength(1)
})
