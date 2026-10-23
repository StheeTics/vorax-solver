// Measures the live game's odds from shared boards, next to the values the engine uses now.
import { writeFileSync } from 'node:fs'
import { ARCHETYPES, RARITIES, SPAWN_WEIGHTS } from '../../src/data/archetypes'
import { NORMAL_POOL, SUPREME_POOL } from '../../src/data/potions'
import { ADVANCED_POOL, BASIC_POOL } from '../../src/data/instruments'
import { SUPREME_CHANCE } from '../../src/engine/draw'
import { LIVE_WEIGHTS } from '../../src/data/liveWeights'
import type { Snapshot } from '../../src/solver/share/snapshot'

export interface Rate { count: number; n: number; p: number; lo: number; hi: number; engine: number }

/** Wilson score interval, 95%. */
export function wilson(k: number, n: number): { lo: number; hi: number } {
  if (!n) return { lo: 0, hi: 1 }
  const z = 1.96
  const p = k / n
  const d = 1 + (z * z) / n
  const c = p + (z * z) / (2 * n)
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return { lo: Math.max(0, (c - m) / d), hi: Math.min(1, (c + m) / d) }
}

const rate = (count: number, n: number, engine: number): Rate => ({ count, n, p: n ? count / n : 0, ...wilson(count, n), engine })

function shares(lists: string[][], engine: (name: string) => number, all: string[]): Record<string, Rate> {
  const n = lists.reduce((s, l) => s + l.length, 0)
  const counts = new Map<string, number>()
  for (const l of lists) for (const x of l) counts.set(x, (counts.get(x) ?? 0) + 1)
  return Object.fromEntries([...new Set([...all, ...counts.keys()])].sort().map(name => [name, rate(counts.get(name) ?? 0, n, engine(name))]))
}

export interface Rates {
  generated: string
  boards: number
  runs: number
  potionOffer: Record<string, Rate>
  boxOffer: Record<string, Rate>
  supreme: Rate
  instrumentOffer: { basic: Record<string, Rate>; advanced: Record<string, Rate> }
  spawnRarity: Record<string, Rate>
  spawnArchetype: Record<string, Rate>
}

/** Whether every field named was read for sure (boards from before unsure fields were shared were all sure). */
const sure = (r: Snapshot, test: (field: string) => boolean) => !(r.unsure ?? []).some(test)

export function computeRates(all: Snapshot[]): Rates {
  // a picture that wasn't the game screen teaches nothing
  const rows = all.filter(r => !r.unreadable)
  // an offer read twice (a re-read after a correction) counts once; only hands read for sure, with the
  // phase and round that say which pool they came from
  const seen = new Set<string>()
  const offers = rows.filter(r => sure(r, f => /^(hand\d|phase|round)$/.test(f))).filter(r => {
    const key = `${r.run}|${r.phase}|${r.round}|${r.refreshes}|${r.hand.join(',')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const potions = offers.filter(r => r.phase === 'potion')
  const normalHands = potions.filter(r => r.hand.length === 3).map(r => r.hand)
  // a Potion Kit opens to a hand of another size
  const boxHands = potions.filter(r => r.hand.length !== 3).map(r => r.hand)
  const supremeNames = new Set(SUPREME_POOL.map(p => p.name))
  const allCards = normalHands.flat()
  // the engine's current chance for each card, from its weights
  const sum = (w: Record<string, number>) => Object.values(w).reduce((s, v) => s + v, 0) || 1
  const potionTotal = sum(LIVE_WEIGHTS.potionOffer)
  const perNormal = (name: string) => ((1 - SUPREME_CHANCE) * (LIVE_WEIGHTS.potionOffer[name] ?? 1)) / potionTotal
  const perSupreme = SUPREME_CHANCE / SUPREME_POOL.length
  const share = (w: Record<string, number>) => (name: string) => (w[name] ?? 1) / sum(w)
  const instruments = offers.filter(r => r.phase === 'instrument')
  const firsts = rows.filter(r => r.seq === 0)
  const tanks = firsts.flatMap(r => r.tanks.filter((t, i): t is NonNullable<typeof t> => t !== null && sure(r, f => /^tank(\d)\.(empty|rarity|archetype)$/.exec(f)?.[1] === String(i))))
  const spawnTotal = RARITIES.reduce((s, r) => s + SPAWN_WEIGHTS[r], 0)

  return {
    generated: new Date().toISOString(),
    boards: rows.length,
    runs: new Set(rows.map(r => r.run)).size,
    potionOffer: shares(normalHands, name => (supremeNames.has(name) ? perSupreme : perNormal(name)), [...NORMAL_POOL, ...SUPREME_POOL].map(p => p.name)),
    boxOffer: shares(boxHands, share(LIVE_WEIGHTS.boxOffer), []),
    supreme: rate(allCards.filter(c => supremeNames.has(c)).length, allCards.length, SUPREME_CHANCE),
    // the pool goes by what's held, as in the engine (src/engine/game.ts instrumentPool), not by the round: the
    // reward for Ultimate Activity at the end of round 1 is an advanced offer on a screen that still says round 1
    instrumentOffer: {
      basic: shares(instruments.filter(r => r.instruments.length === 0).map(r => r.hand), share(LIVE_WEIGHTS.instrumentOffer.basic), BASIC_POOL.map(i => i.name)),
      advanced: shares(instruments.filter(r => r.instruments.length > 0).map(r => r.hand), share(LIVE_WEIGHTS.instrumentOffer.advanced), ADVANCED_POOL.map(i => i.name)),
    },
    spawnRarity: Object.fromEntries(RARITIES.map(r => [r, rate(tanks.filter(t => t.rarity === r).length, tanks.length, SPAWN_WEIGHTS[r] / spawnTotal)])),
    spawnArchetype: Object.fromEntries(ARCHETYPES.map(a => [a, rate(tanks.filter(t => t.archetype === a).length, tanks.length, 1 / ARCHETYPES.length)])),
  }
}

export function writeRates(rows: Snapshot[], file = 'data/live/rates.json'): Rates {
  const r = computeRates(rows)
  writeFileSync(file, JSON.stringify(r, null, 1) + '\n')
  return r
}
