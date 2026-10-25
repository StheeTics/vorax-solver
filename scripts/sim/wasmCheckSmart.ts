// Checks the WebAssembly smarter player against the JavaScript one: the advice's own futures (potions: 2 outcomes per
// move inside, instruments: 4, boards judged by the shipped board value) on boards from simulated games; the totals
// must be identical. Usage: vite-node scripts/sim/wasmCheckSmart.ts [games] [futures]
import { readFileSync } from 'node:fs'
import { setBoardValue } from '@/strategy/value'
import { canRefresh } from '@/engine/game'
import { runGame, evChooser, shortlist, potionFutures, instrumentFutures, valuePicker, type Chooser, type InstrumentPicker, type Tally } from '@/strategy/bot'
import { WasmFutures } from '@/strategy/wasmFutures'

const model = JSON.parse(readFileSync('src/data/boardValue.json', 'utf8'))
setBoardValue(model)
const games = Number(process.argv[2] ?? 10), futures = Number(process.argv[3] ?? 4)
const w = await WasmFutures.load(readFileSync('wasm/target/wasm32-unknown-unknown/release/vorax_futures.wasm'))
w.setModel(model)
const la = { top: 4, playouts: futures, steer: 0.3, value: true, innerSamples: 2 }
const rollout = evChooser({ samples: 4, horizon: 0, value: true })
let boards = 0, bad = 0, tJs = 0, tW = 0
const same = (a: Tally[], b: Tally[]) => a.length === b.length && a.every((t, i) => t.goal === b[i].goal && t.reached === b[i].reached && t.n === b[i].n)
for (let seed = 3000000; seed < 3000000 + games; seed++) {
  const chooser: Chooser = (s, sd) => {
    const slim = { ...s, log: [] }
    const opts = shortlist(slim, sd, la).map(c => c.o)
    let t = performance.now(); const a = potionFutures(slim, sd, la, opts, 0, futures); tJs += performance.now() - t
    t = performance.now(); const b = w.potion(slim, sd, 2, opts, 0, futures, true); tW += performance.now() - t
    boards++
    if (!same(a, b)) { bad++; if (bad < 5) console.log('potion differs', s.round, JSON.stringify(a), JSON.stringify(b)) }
    return evChooser({ samples: 2, horizon: 0, value: true })(s, sd)
  }
  const picker: InstrumentPicker = (s, sd) => {
    const slim = { ...s, log: [] }
    const choices = [...slim.hand.map((_, i) => i), ...(canRefresh(slim) ? ['refresh' as const] : [])]
    let t = performance.now(); const a = instrumentFutures(slim, sd, choices, rollout, 'target', 0, futures); tJs += performance.now() - t
    t = performance.now(); const b = w.instrument(slim, sd, 4, choices, 0, futures, true); tW += performance.now() - t
    boards++
    if (!same(a, b)) { bad++; if (bad < 5) console.log('instrument differs', s.round, JSON.stringify(a), JSON.stringify(b)) }
    return valuePicker(s, sd)
  }
  runGame(seed, chooser, picker)
}
console.log(`${boards} boards, ${bad} differ; JavaScript ${Math.round(tJs)} ms, WebAssembly ${Math.round(tW)} ms (${(tJs / tW).toFixed(1)}x)`)
