import { BASE_STATS } from '@/data/archetypes'
import { hasPotion } from '@/data/potions'
import { instrument } from '@/data/instruments'
import { LAST_ROUND, MAX_INSTRUMENTS } from '@/engine/game'
import type { Archetype, EquippedInstrument, Rarity, SandboxSetup, Tanks } from '@/engine/types'

export interface RawTank {
  empty: boolean
  archetype: Archetype
  rarity: Rarity
  activity: string
  quantity: string
}

/** Form state: free-text numbers, validated into a SandboxSetup on Start. */
export interface RawSetup {
  randomTanks: boolean
  tanks: RawTank[]
  instruments: EquippedInstrument[]
  startRound: string
  thresholdsUsed: { t8000: boolean; t28000: boolean }
  forcedHand: number[]
  seed: string
}

export function defaultRawSetup(): RawSetup {
  return {
    randomTanks: true,
    tanks: Array.from({ length: 6 }, () => ({ empty: true, archetype: 'pest', rarity: 'normal', activity: '', quantity: '' })),
    instruments: [],
    startRound: '1',
    thresholdsUsed: { t8000: false, t28000: false },
    forcedHand: [],
    seed: '',
  }
}

/** Keeps Activity × Quantity (and a game's growth on top) well inside Number.MAX_SAFE_INTEGER. */
export const MAX_STAT = 1_000_000

/** Integer in [1, MAX_STAT]; blank or unparsable → fallback. */
function statValue(text: string, fallback: number): number {
  if (text.trim() === '') return fallback
  const n = Number(text)
  if (Number.isNaN(n)) return fallback
  return Math.min(MAX_STAT, Math.max(1, Math.trunc(n)))
}

function clampRound(text: string | number): number {
  const n = Math.trunc(Number(text))
  return Number.isFinite(n) ? Math.min(LAST_ROUND, Math.max(1, n)) : 1
}

export function validateSetup(raw: RawSetup): { setup: SandboxSetup } | { error: string } {
  if (raw.instruments.length > MAX_INSTRUMENTS) return { error: `Choose at most ${MAX_INSTRUMENTS} Surgical Instruments.` }
  if (raw.instruments.some(i => !instrument(i.id))) return { error: 'Unknown Surgical Instrument.' }
  const startRound = clampRound(raw.startRound)
  const tanks: Tanks | null = raw.randomTanks
    ? null
    : raw.tanks.map(t =>
        t.empty
          ? null
          : {
              archetype: t.archetype,
              rarity: t.rarity,
              activity: statValue(t.activity, BASE_STATS[t.rarity].activity),
              quantity: statValue(t.quantity, BASE_STATS[t.rarity].quantity),
            },
      )
  const seedText = raw.seed.trim()
  const seed = seedText === '' ? undefined : Math.abs(Math.trunc(Number(seedText))) >>> 0
  return {
    setup: {
      tanks,
      instruments: raw.instruments.map(i => ({ id: i.id, acquiredRound: clampRound(i.acquiredRound) })),
      startRound,
      thresholdsUsed: { ...raw.thresholdsUsed },
      forcedHand: raw.forcedHand.filter(hasPotion).slice(0, 3),
      seed: Number.isFinite(seed) ? seed : undefined,
    },
  }
}
