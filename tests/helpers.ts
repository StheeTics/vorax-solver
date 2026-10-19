import { createContext, type EffectContext } from '@/engine/context'
import { createMonster, RARITIES, SPAWN_WEIGHTS } from '@/data/archetypes'
import { stubRng, type Rng } from '@/engine/rng'
import type { InstrumentDef } from '@/data/defs'
import { instrument } from '@/data/instruments'
import type { Archetype, EquippedInstrument, GameEvent, LogEntry, Monster, Rarity, Tanks } from '@/engine/types'


export function m(a: Archetype, r: Rarity, act?: number, qty?: number): Monster {
  const base = createMonster(a, r)
  return { ...base, activity: act ?? base.activity, quantity: qty ?? base.quantity }
}

/**
 * A random number (for stubRng) that rolls this rarity under the current spawn odds: the middle of its band.
 * The odds change as live data comes in, so tests of rarity rolls use this rather than fixed numbers.
 */
export function rollFor(r: Rarity): number {
  const total = RARITIES.reduce((s, x) => s + SPAWN_WEIGHTS[x], 0)
  let before = 0
  for (const x of RARITIES) {
    if (x === r) return (before + SPAWN_WEIGHTS[x] / 2) / total
    before += SPAWN_WEIGHTS[x]
  }
  throw new Error(r)
}

export function board(...ms: (Monster | null)[]): Tanks {
  return [...ms, ...Array(6 - ms.length).fill(null)]
}

export interface CtxOpts {
  rng?: Rng
  round?: number
  instruments?: EquippedInstrument[]
  registry?: (id: number) => InstrumentDef | undefined
}

export function ctx(tanks: Tanks, opts: CtxOpts = {}): { c: EffectContext; log: LogEntry[]; events: GameEvent[] } {
  const log: LogEntry[] = []
  const events: GameEvent[] = []
  const c = createContext({
    tanks,
    rng: opts.rng ?? stubRng([0]),
    round: opts.round ?? 1,
    instruments: opts.instruments ?? [],
    registry: opts.registry ?? instrument,
    log,
    onEvent: e => events.push(e),
  })
  return { c, log, events }
}
