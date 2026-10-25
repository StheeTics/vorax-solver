// Games advised by the WebAssembly futures with a greedy player inside: potions as planChooser picks them (the
// shortlist, each played to the end `futures` times), instruments as boardPicker does. Output as run.ts's, for merge.py.
// VALUE_MODEL=<json>: the smarter player inside instead (the board value, 2 outcomes per potion move and 4 inside
// instrument futures, as the live advice plays them).
// Usage: RAW=1 SEED0=<n> [VALUE_MODEL=src/data/boardValue.json] vite-node scripts/sim/wasmRun.ts <games> <futures> [samples]
import { readFileSync } from 'node:fs'
import { setBoardValue } from '@/strategy/value'
import { canRefresh, ultimateActivity } from '@/engine/game'
import { runGame, shortlist, stats, type Chooser, type InstrumentPicker } from '@/strategy/bot'
import type { GameState } from '@/engine/types'
import { potion } from '@/data/potions'
import { WasmFutures } from '@/strategy/wasmFutures'
import { LIVE_WEIGHTS } from '@/data/liveWeights'

const model = process.env.VALUE_MODEL ? JSON.parse(readFileSync(process.env.VALUE_MODEL, 'utf8')) : null
setBoardValue(model)
const smart = !!model
const N = Number(process.argv[2]), futures = Number(process.argv[3])
const samples = Number(process.argv[4] ?? (smart ? 2 : 1)), instrumentSamples = smart ? 4 : samples
const SEED0 = Number(process.env.SEED0 ?? 1_000_000)
// the file the Solver ships (npm run wasm), with today's odds: the nightly updates them without a rebuild
const w = await WasmFutures.load(readFileSync('src/strategy/futures.wasm'))
w.setOdds(LIVE_WEIGHTS)
w.setModel(model)
const la = { top: 4, playouts: futures, steer: smart ? 0.3 : 0, value: smart }

const chooser: Chooser = (s, seed) => {
  const slim = { ...s, log: [] }
  const runs = shortlist(slim, seed, la)
  const t = w.potion(slim, seed, samples, runs.map(r => r.o), 0, futures, smart)
  const ranked = runs.map((r, i) => ({ r, goal: t[i].goal / t[i].n })).sort((a, b) => b.goal - a.goal)
  const best = ranked[0]?.r
  return { best: best?.o ?? [], value: best?.v ?? -1 }
}
// KIT_RULE=1: the Solver's rule, as run.ts has it: a Potion Kit on offer is taken instead of a potion reroll
const withKit: Chooser = (st, sd) => {
  const r = chooser(st, sd)
  const rerolls = r.best[0]?.type === 'refresh' || (st.openBox === null && r.value <= ultimateActivity(st) && st.potionRefreshes > 0)
  const kit = st.openBox === null ? st.hand.findIndex(c => c.kind === 'potion' && typeof potion(c.id)?.targeting === 'object') : -1
  return rerolls && kit >= 0 ? { best: [{ type: 'selectCard', index: kit }, { type: 'confirm' }], value: Infinity } : r
}
const advise = process.env.KIT_RULE ? withKit : chooser
const picker: InstrumentPicker = (s, seed) => {
  const slim = { ...s, log: [] }
  const offers = w.instrument(slim, seed, instrumentSamples, slim.hand.map((_, i) => i), 0, futures, smart).map(t => t.goal / t.n)
  const refresh = canRefresh(slim) ? w.instrument(slim, seed, instrumentSamples, ['refresh'], 0, futures, smart).map(t => t.goal / t.n)[0] : null
  const best = offers.indexOf(Math.max(...offers))
  return refresh !== null && refresh > offers[best] ? 'refresh' : best
}

const t0 = Date.now()
const scores: number[] = []; const decisions: object[] = []
const board = (s: GameState) => s.tanks.map(t => (t ? `${t.rarity[0]}${t.archetype}` : '-')).join(' ')
for (let seed = SEED0; seed < SEED0 + N; seed++) {
  // every choice, as run.ts's board mode logs them: what was offered and what was taken
  const picks: object[] = []; const potions: object[] = []
  const logging: Chooser = (st, sd) => {
    const r = advise(st, sd)
    const played = r.best[0]?.type === 'selectCard' ? st.hand[r.best[0].index]?.id : undefined
    potions.push({ round: st.round, have: st.instruments.map(i => i.id), box: st.openBox, offer: st.hand.map(c => c.id), played })
    return r
  }
  const s = runGame(seed, logging, picker, undefined, (st, pick) =>
    picks.push({ round: st.round, have: st.instruments.map(i => i.id), offer: st.hand.map(c => c.id), pick: pick === 'refresh' ? 'refresh' : st.hand[pick].id, board: board(st) }))
  scores.push(ultimateActivity(s))
  decisions.push({ seed, score: ultimateActivity(s), build: s.instruments.map(i => i.id), picks, potions })
}
console.log(JSON.stringify({ label: `wasm ${smart ? 'smart' : 'greedy'} (${futures} futures)`, policy: `wasm${smart ? '-smart' : ''}:${futures}:${samples}`, ...stats(scores), ...(process.env.RAW ? { scores, decisions } : {}), secs: (Date.now() - t0) / 1000 }))
