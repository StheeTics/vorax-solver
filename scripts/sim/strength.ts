// How strong each instrument is, for the instrument picks inside the Solver's playouts (src/strategy/bot.ts).
// Each instrument is played in `games` sandbox games, equipped from round 1 with partners dealt by the live
// offer odds (a basic gets two advanced; an advanced gets a basic and another advanced). Its strength is the
// mean final score counted up to the advice's target (goalScore). Game g uses the same seed and partner draw
// for every instrument, so they are compared on the same luck.
// Run by scripts/sim/strength.sh, which writes src/data/instrumentStrength.json.
import { ADVANCED_POOL, BASIC_POOL, INSTRUMENTS } from '@/data/instruments'
import type { InstrumentDef } from '@/data/defs'
import { LIVE_WEIGHTS } from '@/data/liveWeights'
import { createRng, type Rng } from '@/engine/rng'
import { ultimateActivity } from '@/engine/game'
import { evChooser, goalScore, runGame } from '@/strategy/bot'

const offerWeight = (d: InstrumentDef) => LIVE_WEIGHTS.instrumentOffer[d.pool as 'basic' | 'advanced'][d.name] ?? 1
const draw = (rng: Rng, pool: InstrumentDef[], not: number[]) => rng.weighted(pool.filter(d => !not.includes(d.id)), offerWeight)

function partners(x: InstrumentDef, rng: Rng): number[] {
  if (x.pool === 'basic') { const a = draw(rng, ADVANCED_POOL, []).id; return [a, draw(rng, ADVANCED_POOL, [a]).id] }
  return [draw(rng, BASIC_POOL, []).id, draw(rng, ADVANCED_POOL, [x.id]).id]
}

const chooser = evChooser({ samples: 8, horizon: 0 })

export function measureStrength(name: string, games: number, seed0 = 1): number {
  const x = INSTRUMENTS.find(d => d.name === name)!
  let sum = 0
  for (let g = 0; g < games; g++) {
    const seed = seed0 + g
    const [p, q] = partners(x, createRng(seed ^ 0x51a7))
    const ids = x.pool === 'basic' ? [x.id, p, q] : [p, x.id, q]
    const setup = { tanks: null, instruments: ids.map(id => ({ id, acquiredRound: 1 })), startRound: 1, thresholdsUsed: { t8000: true, t28000: true }, forcedHand: [], seed }
    sum += goalScore(ultimateActivity(runGame(seed, chooser, undefined, setup)))
  }
  return sum / games
}

