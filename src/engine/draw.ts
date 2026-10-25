import { BOX_POOL, NORMAL_POOL, SUPREME_POOL } from '@/data/potions'
import { ADVANCED_POOL, BASIC_POOL } from '@/data/instruments'
import { LIVE_WEIGHTS } from '@/data/liveWeights'
import type { Rng } from './rng'
import type { Card, EquippedInstrument } from './types'

export const SUPREME_CHANCE = LIVE_WEIGHTS.supremeChance

/** Each pool's weights by position, worked out once per weights table (pools and tables are fixed). */
const weightCache = new WeakMap<object, WeakMap<object, number[]>>()
function weightsOf(pool: { name: string }[], weights: Record<string, number>): number[] {
  let byTable = weightCache.get(pool)
  if (!byTable) weightCache.set(pool, (byTable = new WeakMap()))
  let w = byTable.get(weights)
  if (!w) byTable.set(weights, (w = pool.map(x => weights[x.name] ?? 1)))
  return w
}

/** One of pool's items not in `used`: uniformly while every weight is equal (the same dice as before weights
 *  existed), else by weight. The same dice as filtering the pool first, without the copies. */
function pickFresh<T extends { id: number; name: string }>(rng: Rng, pool: T[], used: Set<number>, weights: Record<string, number> | null): T | undefined {
  const all = weights ? weightsOf(pool, weights) : null
  let n = 0, total = 0, first = -1, equal = true
  for (let i = 0; i < pool.length; i++) {
    if (used.has(pool[i].id)) continue
    n++
    if (!all) continue
    const wi = all[i]
    if (first < 0) first = i
    else if (wi !== all[first]) equal = false
    total += Math.max(0, wi)
  }
  if (n === 0) return undefined
  const nth = (k: number) => {
    for (let i = 0; i < pool.length; i++) if (!used.has(pool[i].id) && k-- === 0) return pool[i]
    return undefined
  }
  if (!all || equal) return nth(rng.int(n))
  let r = rng.next() * total
  let last: T | undefined
  for (let i = 0; i < pool.length; i++) {
    if (used.has(pool[i].id)) continue
    last = pool[i]
    r -= Math.max(0, all[i])
    if (r < 0) return pool[i]
  }
  return last
}

/** n distinct potions; each card independently has SUPREME_CHANCE to be Supreme. */
export function dealPotions(rng: Rng, n: number, fromBox: boolean): Card[] {
  const base = fromBox ? BOX_POOL : NORMAL_POOL
  const used = new Set<number>()
  const hand: Card[] = []
  const left = (pool: typeof base) => pool.some(p => !used.has(p.id))
  for (let i = 0; i < n; i++) {
    const supreme = rng.chance(SUPREME_CHANCE)
    let pool = supreme ? SUPREME_POOL : base
    if (!left(pool)) pool = supreme ? base : SUPREME_POOL
    const firstFresh = pool.find(p => !used.has(p.id))
    const p = supreme && firstFresh?.rarity === 'supreme' ? pickFresh(rng, pool, used, null) : pickFresh(rng, pool, used, fromBox ? LIVE_WEIGHTS.boxOffer : LIVE_WEIGHTS.potionOffer)
    if (!p) break
    used.add(p.id)
    hand.push({ kind: 'potion', id: p.id })
  }
  return hand
}

export function dealInstruments(rng: Rng, pool: 'basic' | 'advanced', equipped: EquippedInstrument[]): Card[] {
  const owned = new Set(equipped.map(e => e.id))
  const available = (pool === 'basic' ? BASIC_POOL : ADVANCED_POOL).filter(d => !owned.has(d.id))
  const weights = LIVE_WEIGHTS.instrumentOffer[pool]
  const w = (d: { name: string }) => weights[d.name] ?? 1
  if (available.every(d => w(d) === w(available[0]))) return rng.sample(available, 3).map(d => ({ kind: 'instrument', id: d.id }))
  const left = [...available]
  const out: Card[] = []
  while (out.length < 3 && left.length) {
    const d = rng.weighted(left, w)
    left.splice(left.indexOf(d), 1)
    out.push({ kind: 'instrument', id: d.id })
  }
  return out
}
