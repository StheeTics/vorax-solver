// The advice's futures with a greedy player, played by WebAssembly (wasm/: the engine ported to Rust, rolling the same
// dice in the same order, so it plays the same futures as potionFutures/instrumentFutures with no board value).
import type { Action, GameState } from '@/engine/types'
import { ARCHETYPES, RARITIES } from '@/data/archetypes'
import type { InstrumentChoice, Tally } from './bot'

interface Exports { memory: WebAssembly.Memory; buf(): number; potion_futures(seed: number, samples: number, from: number, to: number): number; instrument_futures(seed: number, samples: number, from: number, to: number): number }
const OPTS = 64, OUT = 4096
const PHASES = ['instrumentSelect', 'potionSelect', 'roundEnd', 'gameOver'] as const

export class WasmFutures {
  private constructor(private x: Exports) {}
  static async load(bytes: BufferSource): Promise<WasmFutures> {
    const { instance } = await WebAssembly.instantiate(bytes, {})
    return new WasmFutures(instance.exports as unknown as Exports)
  }
  private view() { return new Float64Array(this.x.memory.buffer, this.x.buf(), 8192) }
  private write(b: Float64Array, s: GameState) {
    b.fill(0, 0, OPTS)
    s.tanks.forEach((m, i) => {
      if (!m) return
      b.set([1, ARCHETYPES.indexOf(m.archetype), RARITIES.indexOf(m.rarity), m.activity, m.quantity], i * 5)
    })
    b[30] = s.instruments.length
    s.instruments.forEach((e, i) => b.set([e.id, e.acquiredRound], 31 + i * 2))
    b[37] = s.round
    b[38] = PHASES.indexOf(s.phase)
    b[39] = s.hand.length
    s.hand.forEach((c, i) => b.set([c.kind === 'potion' ? 0 : 1, c.id], 40 + i * 2))
    b[50] = s.openBox ?? -1
    b[51] = s.selected ?? -1
    b[52] = s.targets.length
    s.targets.forEach((t, i) => (b[53 + i] = t))
    b.set([s.potionRefreshes, s.instrumentRefreshes, +s.thresholds.t8000, +s.thresholds.t28000, s.pendingPicks, s.rngState >>> 0], 55)
  }
  private read(b: Float64Array, n: number): Tally[] {
    return Array.from({ length: n }, (_, i) => ({ goal: b[OUT + i * 3], reached: b[OUT + i * 3 + 1], n: b[OUT + i * 3 + 2] }))
  }
  /** potionFutures with a greedy player: `samples` outcomes per move inside */
  potion(s: GameState, seed: number, samples: number, opts: Action[][], from: number, to: number): Tally[] {
    const b = this.view()
    this.write(b, s)
    let at = OPTS
    b[at++] = opts.length
    for (const o of opts) {
      b[at++] = o.length
      for (const a of o) {
        b[at++] = a.type === 'selectCard' ? 0 : a.type === 'toggleTarget' ? 1 : a.type === 'confirm' ? 2 : 3
        b[at++] = a.type === 'selectCard' ? a.index : a.type === 'toggleTarget' ? a.tank : 0
      }
    }
    // a call can grow the memory, which leaves views made before it empty
    const n = this.x.potion_futures(seed >>> 0, samples, from, to)
    return this.read(this.view(), n)
  }
  /** instrumentFutures with a greedy player */
  instrument(s: GameState, seed: number, samples: number, choices: InstrumentChoice[], from: number, to: number): Tally[] {
    const b = this.view()
    this.write(b, s)
    b[OPTS] = choices.length
    choices.forEach((c, i) => (b[OPTS + 1 + i] = c === 'refresh' ? -1 : c))
    const n = this.x.instrument_futures(seed >>> 0, samples, from, to)
    return this.read(this.view(), n)
  }
}
