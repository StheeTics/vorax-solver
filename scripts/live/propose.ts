// Moves the engine's odds towards what the live game shows, with guards: a weight changes only with at
// least 30 observations, only when the 95% range excludes the current value, and by at most 2x per update
// (a floor of 0.002 lets a weight at zero start to grow). Writes src/data/liveWeights.ts when anything
// changed and prints one line per change, for the commit message (scripts/live/weights.ts runs it).
import type { LiveWeights } from '../../src/data/liveWeights'
import type { Rate, Rates } from './rates'

const MIN_N = 30
const FLOOR = 0.002

/** A share moved towards the live one, within the guards; null when it should stay. */
function step(current: number, r: Rate | undefined): number | null {
  if (!r || r.n < MIN_N || (current >= r.lo && current <= r.hi)) return null
  return Math.min(Math.max(r.p, current / 2), Math.max(current * 2, FLOOR))
}

const pct = (r: Rate) => `live ${(100 * r.p).toFixed(1)}% of ${r.n}`
const fmt = (v: number) => String(Math.round(v * 10000) / 10000)

/** Weights as relative numbers: each share is weight / total, and a new share becomes a new weight at the same total. */
function stepGroup(label: string, weights: Record<string, number>, rates: Record<string, Rate>, scale: number, changes: string[]): Record<string, number> {
  const total = Object.values(weights).reduce((s, w) => s + w, 0)
  if (!total) return weights
  const next = { ...weights }
  for (const [name, w] of Object.entries(weights)) {
    const share = (w / total) * scale
    const r = rates[name]
    const s = step(share, r)
    if (s === null) continue
    next[name] = (s / scale) * total
    changes.push(`${label} ${name} ${fmt(w)} → ${fmt(next[name])} (${pct(r!)})`)
  }
  return next
}

export function proposeWeights(current: LiveWeights, rates: Rates): { next: LiveWeights; changes: string[] } {
  const changes: string[] = []
  const next: LiveWeights = structuredClone(current)
  const s = step(current.supremeChance, rates.supreme)
  if (s !== null) {
    next.supremeChance = s
    changes.push(`supremeChance ${fmt(current.supremeChance)} → ${fmt(s)} (${pct(rates.supreme)})`)
  }
  next.potionOffer = stepGroup('potion', current.potionOffer, rates.potionOffer, 1 - current.supremeChance, changes)
  next.boxOffer = stepGroup('box', current.boxOffer, rates.boxOffer, 1, changes)
  next.instrumentOffer.basic = stepGroup('basic instrument', current.instrumentOffer.basic, rates.instrumentOffer.basic, 1, changes)
  next.instrumentOffer.advanced = stepGroup('advanced instrument', current.instrumentOffer.advanced, rates.instrumentOffer.advanced, 1, changes)
  next.spawnRarity = stepGroup('spawn', current.spawnRarity, rates.spawnRarity, 1, changes) as LiveWeights['spawnRarity']
  return { next, changes }
}

export function renderWeights(w: LiveWeights): string {
  return `// The engine's odds, measured from live games (scripts/live/weights.ts writes this file).
// Offer weights are relative: a card's chance is its weight over the pool's total.
import type { Rarity } from '@/engine/types'

export interface LiveWeights {
  updated: string
  supremeChance: number
  potionOffer: Record<string, number>
  boxOffer: Record<string, number>
  instrumentOffer: { basic: Record<string, number>; advanced: Record<string, number> }
  spawnRarity: Record<Rarity, number>
}

export const LIVE_WEIGHTS: LiveWeights = ${JSON.stringify(w, null, 2).replace(/"(\w+)":/g, '$1:').replace(/"/g, "'")}
`
}
