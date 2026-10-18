import { readFileSync } from 'node:fs'
import { createRng } from '@/engine/rng'
import { dealInstruments, dealPotions } from '@/engine/draw'
import { rollArchetype, rollRarity } from '@/data/archetypes'
import { LIVE_WEIGHTS } from '@/data/liveWeights'
import { potion } from '@/data/potions'
import { instrument } from '@/data/instruments'

it('the same seed always deals the same cards (tests/fixtures/deals-seed1.json)', () => {
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

it('starting tanks keep the guessed rarities until live games measure them', () => {
  expect(LIVE_WEIGHTS.spawnRarity).toEqual({ normal: 30, magic: 40, rare: 20, boss: 10 })
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

describe('the odds measured in live games (14 games, 2026-10-18)', () => {
  const potionRarity = () => {
    const rng = createRng(11)
    const n = { normal: 0, magic: 0, rare: 0, supreme: 0 }
    for (let i = 0; i < 20_000; i++) for (const c of dealPotions(rng, 3, false)) n[potion(c.id)!.rarity as keyof typeof n]++
    const t = Object.values(n).reduce((a, b) => a + b, 0)
    return Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v / t]))
  }
  it('offers Normal potions most and Rare ones least, as live (37% / 39% / 21%)', () => {
    const r = potionRarity()
    expect(r.normal).toBeCloseTo(0.37, 1)
    expect(r.magic).toBeCloseTo(0.39, 1)
    expect(r.rare).toBeCloseTo(0.21, 1)
    expect(r.supreme).toBeGreaterThan(0.008)
    expect(r.supreme).toBeLessThan(0.02)
  })
  const offered = (pool: 'basic' | 'advanced') => {
    const rng = createRng(12)
    const n = new Map<string, number>()
    for (let i = 0; i < 20_000; i++) for (const c of dealInstruments(rng, pool, [])) n.set(instrument(c.id)!.name, (n.get(instrument(c.id)!.name) ?? 0) + 1)
    return n
  }
  it('offers the strong basics (Incubation Sac, Chrysalis Specimen, Hyperplastic Frontal Lobe) about a third as often as the others', () => {
    const n = offered('basic')
    const ratio = n.get('Incubation Sac')! / n.get('Contracted Claws')!
    expect(ratio).toBeGreaterThan(0.25)
    expect(ratio).toBeLessThan(0.45)
  })
  it('offers the rare advanced instruments (Lady of the Plague Quarter, Beak, …) about a quarter as often as the others', () => {
    const n = offered('advanced')
    const ratio = n.get('Lady of the Plague Quarter')! / n.get('Black Goat Gut Suture')!
    expect(ratio).toBeGreaterThan(0.15)
    expect(ratio).toBeLessThan(0.35)
  })
})
