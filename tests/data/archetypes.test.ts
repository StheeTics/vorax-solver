import { rollFor } from '../helpers'
import { rollRarity, nextRarity, monsterName, createMonster, isRareOrBoss, total } from '@/data/archetypes'
import { stubRng } from '@/engine/rng'

it('rollRarity rolls each rarity within its share of the spawn odds, in order', () => {
  for (const r of ['normal', 'magic', 'rare', 'boss'] as const) expect(rollRarity(stubRng([rollFor(r)]))).toBe(r)
  expect(rollRarity(stubRng([0]))).toBe('normal')
  expect(rollRarity(stubRng([0.999999]))).toBe('boss')
})
it('nextRarity caps at boss', () => {
  expect(nextRarity('normal')).toBe('magic')
  expect(nextRarity('boss')).toBe('boss')
})
it('monsterName is "<Rarity> <Archetype>"', () => {
  expect(monsterName(createMonster('boneSentry', 'rare'))).toBe('Rare Bone Sentry')
})
it('createMonster applies base stats plus bonuses', () => {
  expect(createMonster('pest', 'normal', 0, 73)).toEqual({ archetype: 'pest', rarity: 'normal', activity: 1, quantity: 109 })
})
it('isRareOrBoss and total', () => {
  expect(isRareOrBoss('boss')).toBe(true)
  expect(isRareOrBoss('magic')).toBe(false)
  expect(total(createMonster('agito', 'rare'))).toBe(180)
  expect(total(null)).toBe(0)
})
