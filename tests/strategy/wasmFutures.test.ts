// The WebAssembly futures (src/strategy/futures.wasm, built from wasm/ by `npm run wasm`) must play exactly the
// JavaScript's: a rule, card or odds change on one side only fails here. Rebuild with `npm run wasm` after one.
import { readFileSync } from 'node:fs'
import { createGame, DEFAULT_SETTINGS, canRefresh } from '@/engine/game'
import { evChooser, finish, valuePicker, shortlist, potionFutures, instrumentFutures, mix, type Tally } from '@/strategy/bot'
import { LOOK_AHEAD, INSTRUMENT_ROLLOUT } from '@/strategy/advisor'
import { setBoardValue, useShippedBoardValue, currentBoardValue } from '@/strategy/value'
import { LIVE_WEIGHTS } from '@/data/liveWeights'
import { WasmFutures } from '@/strategy/wasmFutures'
import type { GameState } from '@/engine/types'

const load = async () => {
  const f = await WasmFutures.load(readFileSync('src/strategy/futures.wasm'))
  f.setOdds(LIVE_WEIGHTS)
  return f
}

/** boards along a few games: every potion and instrument choice a greedy player meets */
function boards(games: number): GameState[] {
  const out: GameState[] = []
  const inner = evChooser({ samples: 1, horizon: 0 })
  for (let seed = 4200; seed < 4200 + games; seed++) {
    finish(createGame(DEFAULT_SETTINGS, undefined, seed), seed, (s, sd) => (out.push({ ...s, log: [] }), inner(s, sd)), (s, sd) => (out.push({ ...s, log: [] }), valuePicker(s, sd)))
  }
  return out
}

const same = (a: Tally[], b: Tally[]) => expect(b).toEqual(a)

describe('the WebAssembly futures play the JavaScript ones', () => {
  afterEach(() => useShippedBoardValue())

  for (const smart of [false, true]) {
    it(smart ? 'with the board value (the smarter player)' : 'greedy (no board value)', async () => {
      if (!smart) setBoardValue(null)
      const f = await load()
      f.setModel(currentBoardValue())
      // greedy has no steer either: the board value replaces it in the smarter player
      const la = { ...LOOK_AHEAD, value: smart, steer: smart ? LOOK_AHEAD.steer : 0, playouts: 2 }
      const rollout = evChooser({ ...INSTRUMENT_ROLLOUT, value: smart })
      for (const [i, s] of boards(3).entries()) {
        const seed = mix(77, i)
        if (s.phase === 'potionSelect') {
          const opts = shortlist(s, seed, la).map(c => c.o)
          same(potionFutures(s, seed, la, opts, 0, 2), f.potion(s, seed, la.innerSamples ?? 2, opts, 0, 2, smart))
        } else if (s.phase === 'instrumentSelect') {
          const choices = [...s.hand.map((_, k) => k), ...(canRefresh(s) ? ['refresh' as const] : [])]
          same(instrumentFutures(s, seed, choices, rollout, 'target', 0, 2), f.instrument(s, seed, INSTRUMENT_ROLLOUT.samples, choices, 0, 2, smart))
        }
      }
    }, 120_000)
  }
})
