import { readFileSync } from 'node:fs'
import { createRng } from '@/engine/rng'
import { dealInstruments, dealPotions } from '@/engine/draw'
import { rollArchetype, rollRarity } from '@/data/archetypes'
import { LIVE_WEIGHTS } from '@/data/liveWeights'

it('with the starting weights, deals are exactly what they were before weights existed', () => {
  const golden = JSON.parse(readFileSync('tests/fixtures/deals-seed1.json', 'utf8'))
  const rng = createRng(1)
  for (let i = 0; i < 200; i++) {
    const got = [dealPotions(rng, 3, false).map(c => c.id), dealPotions(rng, 5, true).map(c => c.id), dealInstruments(rng, i % 2 ? 'advanced' : 'basic', []).map(c => c.id), rollRarity(rng), rollArchetype(rng)]
    expect(got).toEqual(golden[i])
  }
})

it('weighted picks follow their weights', () => {
  const rng = createRng(7)
  const counts = { a: 0, b: 0, c: 0 }
  const w = { a: 1, b: 2, c: 7 }
  for (let i = 0; i < 100_000; i++) counts[rng.weighted(['a', 'b', 'c'] as const, x => w[x])]++
  expect(counts.a / 100_000).toBeCloseTo(0.1, 1)
  expect(counts.c / 100_000).toBeCloseTo(0.7, 1)
})

it('the starting weights are the old guesses', () => {
  expect(LIVE_WEIGHTS.supremeChance).toBe(0.01)
  expect(LIVE_WEIGHTS.spawnRarity).toEqual({ normal: 30, magic: 40, rare: 20, boss: 10 })
  expect(new Set(Object.values(LIVE_WEIGHTS.potionOffer))).toEqual(new Set([1]))
})

it('rarity rolls use the weights total, whatever it sums to', async () => {
  vi.resetModules()
  vi.doMock('@/data/liveWeights', () => ({ LIVE_WEIGHTS: { ...LIVE_WEIGHTS, spawnRarity: { normal: 5, magic: 0, rare: 0, boss: 0 } } }))
  const { rollRarity } = await import('@/data/archetypes')
  const { createRng: fresh } = await import('@/engine/rng')
  const rng = fresh(3)
  for (let i = 0; i < 200; i++) expect(rollRarity(rng)).toBe('normal')
  vi.doUnmock('@/data/liveWeights')
  vi.resetModules()
})
