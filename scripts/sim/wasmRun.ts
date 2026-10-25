// Games advised by the WebAssembly futures with a greedy player inside: potions as planChooser picks them (the
// shortlist, each played to the end `futures` times), instruments as boardPicker does. Output as run.ts's, for merge.py.
// Usage: RAW=1 SEED0=<n> vite-node scripts/sim/wasmRun.ts <games> <futures> [samples]
import { readFileSync } from 'node:fs'
import { setBoardValue } from '@/strategy/value'
import { canRefresh, ultimateActivity } from '@/engine/game'
import { runGame, shortlist, stats, type Chooser, type InstrumentPicker } from '@/strategy/bot'
import { WasmFutures } from '@/strategy/wasmFutures'

setBoardValue(null)
const N = Number(process.argv[2]), futures = Number(process.argv[3]), samples = Number(process.argv[4] ?? 1)
const SEED0 = Number(process.env.SEED0 ?? 1_000_000)
const w = await WasmFutures.load(readFileSync('wasm/target/wasm32-unknown-unknown/release/vorax_futures.wasm'))
const la = { top: 4, playouts: futures }

const chooser: Chooser = (s, seed) => {
  const slim = { ...s, log: [] }
  const runs = shortlist(slim, seed, la)
  const t = w.potion(slim, seed, samples, runs.map(r => r.o), 0, futures)
  const ranked = runs.map((r, i) => ({ r, goal: t[i].goal / t[i].n })).sort((a, b) => b.goal - a.goal)
  const best = ranked[0]?.r
  return { best: best?.o ?? [], value: best?.v ?? -1 }
}
const picker: InstrumentPicker = (s, seed) => {
  const slim = { ...s, log: [] }
  const offers = w.instrument(slim, seed, samples, slim.hand.map((_, i) => i), 0, futures).map(t => t.goal / t.n)
  const refresh = canRefresh(slim) ? w.instrument(slim, seed, samples, ['refresh'], 0, futures).map(t => t.goal / t.n)[0] : null
  const best = offers.indexOf(Math.max(...offers))
  return refresh !== null && refresh > offers[best] ? 'refresh' : best
}

const t0 = Date.now()
const scores: number[] = []
for (let seed = SEED0; seed < SEED0 + N; seed++) scores.push(ultimateActivity(runGame(seed, chooser, picker)))
console.log(JSON.stringify({ label: `wasm greedy (${futures} futures)`, policy: `wasm:${futures}:${samples}`, ...stats(scores), ...(process.env.RAW ? { scores } : {}), secs: (Date.now() - t0) / 1000 }))
