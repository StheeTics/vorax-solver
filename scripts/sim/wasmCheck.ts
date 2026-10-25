// Checks the WebAssembly futures against the JavaScript ones: the same boards (from simulated games), the same
// futures, totals that must be identical. Usage: vite-node scripts/sim/wasmCheck.ts [games] [futures]
import { readFileSync } from 'node:fs'
import { setBoardValue } from '@/strategy/value'
import { canRefresh } from '@/engine/game'
import { runGame, evChooser, shortlist, potionFutures, instrumentFutures, type Chooser, type InstrumentPicker, valuePicker } from '@/strategy/bot'
import { WasmFutures } from '@/strategy/wasmFutures'

setBoardValue(null)
const games = Number(process.argv[2] ?? 20), futures = Number(process.argv[3] ?? 4)
const w = await WasmFutures.load(readFileSync('wasm/target/wasm32-unknown-unknown/release/vorax_futures.wasm'))
let boards = 0, bad = 0, tJs = 0, tW = 0
const same = (a: { goal: number; reached: number; n: number }[], b: typeof a) => a.length === b.length && a.every((t, i) => t.goal === b[i].goal && t.reached === b[i].reached && t.n === b[i].n)
for (const samples of [1, 2]) {
  const la = { top: 4, playouts: futures, steer: 0, value: false, innerSamples: samples }
  const inner = evChooser({ samples, horizon: 0 })
  for (let seed = 3000000; seed < 3000000 + games; seed++) {
    const chooser: Chooser = (s, sd) => {
      const slim = { ...s, log: [] }
      const opts = shortlist(slim, sd, la).map(c => c.o)
      let t = performance.now(); const a = potionFutures(slim, sd, la, opts, 0, futures); tJs += performance.now() - t
      t = performance.now(); const b = w.potion(slim, sd, samples, opts, 0, futures); tW += performance.now() - t
      boards++
      if (!same(a, b)) { bad++; if (bad < 5) console.log('potion differs', s.round, JSON.stringify(a), JSON.stringify(b)) }
      return inner(s, sd)
    }
    const picker: InstrumentPicker = (s, sd) => {
      const slim = { ...s, log: [] }
      const choices = [...slim.hand.map((_, i) => i), ...(canRefresh(slim) ? ['refresh' as const] : [])]
      let t = performance.now(); const a = instrumentFutures(slim, sd, choices, inner, 'target', 0, futures); tJs += performance.now() - t
      t = performance.now(); const b = w.instrument(slim, sd, samples, choices, 0, futures); tW += performance.now() - t
      boards++
      if (!same(a, b)) { bad++; if (bad < 5) console.log('instrument differs', s.round, JSON.stringify(a), JSON.stringify(b)) }
      return valuePicker(s, sd)
    }
    runGame(seed, chooser, picker)
  }
}
console.log(`${boards} boards, ${bad} differ; JavaScript ${Math.round(tJs)} ms, WebAssembly ${Math.round(tW)} ms (${(tJs / tW).toFixed(1)}x)`)
