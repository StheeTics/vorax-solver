import { BOX_POOL, NORMAL_POOL, SUPREME_POOL } from '@/data/potions'
import { ADVANCED_POOL, BASIC_POOL } from '@/data/instruments'
import type { Rng } from './rng'
import type { Card, EquippedInstrument } from './types'

export const SUPREME_CHANCE = 0.01

/** n distinct potions; each card independently has a 1% chance to be Supreme. */
export function dealPotions(rng: Rng, n: number, fromBox: boolean): Card[] {
  const base = fromBox ? BOX_POOL : NORMAL_POOL
  const used = new Set<number>()
  const hand: Card[] = []
  for (let i = 0; i < n; i++) {
    const supreme = rng.chance(SUPREME_CHANCE)
    const fresh = (pool: typeof base) => pool.filter(p => !used.has(p.id))
    let pool = fresh(supreme ? SUPREME_POOL : base)
    if (pool.length === 0) pool = fresh(supreme ? base : SUPREME_POOL)
    const p = rng.pick(pool)
    if (!p) break
    used.add(p.id)
    hand.push({ kind: 'potion', id: p.id })
  }
  return hand
}

export function dealInstruments(rng: Rng, pool: 'basic' | 'advanced', equipped: EquippedInstrument[]): Card[] {
  const owned = new Set(equipped.map(e => e.id))
  const available = (pool === 'basic' ? BASIC_POOL : ADVANCED_POOL).filter(d => !owned.has(d.id))
  return rng.sample(available, 3).map(d => ({ kind: 'instrument', id: d.id }))
}
