// Usage: vite-node scripts/sim/run.ts <games> <policy> <mode> <json>
//   policy: peek | ev:<samples>:<horizon>[:<rollSamples>] | plan:<top>:<playouts>[:<steer>[:<innerSamples>[:halving]]] (potions judged by how the run ends; steer: futures build toward the instruments)
//   mode:   real  <Plan[]>      everything dealt; instruments by the plan's fixed wish list
//           board <number>      everything dealt; instruments picked from the board (<number> playouts per option)
//           fixed <number[][]>  listed instruments equipped from round 1
// REFRESH_PLAYOUTS=<n> gives the refresh option its own number of futures.
// GOAL=mean judges instrument picks by the average final score (the old way) instead of the rainbow goal.
// RAW=1 adds per-game scores (and, in board mode, every instrument decision) for merge.py.
import { instrument } from '@/data/instruments'
import { potion } from '@/data/potions'
import { readFileSync } from 'node:fs'
import { setBoardValue } from '@/strategy/value'
import { buildProgress } from '@/strategy/steer'
import { toState } from '@/strategy/advisor'
import { ultimateActivity } from '@/engine/game'
import type { GameState } from '@/engine/types'
import { finish, goalScore, options, play, valuePicker, type InstrumentPicker } from '@/strategy/bot'
import { canRefresh } from '@/engine/game'
import { runGame, stats, evChooser, peekChooser, planChooser, planPicker, boardPicker, rankInstruments, type Plan, type Chooser } from '@/strategy/bot'

const [, , nArg, pol, mode, json] = process.argv
const N = Number(nArg); const SEED0 = Number(process.env.SEED0 ?? 1_000_000); const RAW = !!process.env.RAW
// VALUE_MODEL=<json>: the player inside every future picks by that board value (the smarter player); without it,
// boards are judged by their score (instrument offers too)
const SMART = !!process.env.VALUE_MODEL
setBoardValue(SMART ? JSON.parse(readFileSync(process.env.VALUE_MODEL!, 'utf8')) : null)
const chooser: Chooser = pol === 'peek' ? peekChooser : pol.startsWith('plan:') ? (() => { const [, top, playouts, steer, inner] = pol.split(':').map(Number); return planChooser({ top, playouts, steer: steer || 0, value: SMART, innerSamples: inner || 2, halving: pol.endsWith(':halving') }) })() : (() => { const [, k, h, r] = pol.split(":").map(Number); return evChooser({ samples: k, horizon: h, rollSamples: r || 1 }) })()
// KIT_RULE=1: the Solver's rule: a Potion Kit on offer is taken instead of a potion reroll
// ORACLE=1: a cheater, for the ceiling: each choice is played to the end with the game's real upcoming cards and
// outcomes (the inner player after it), and the best real ending is taken
const oracleInner = evChooser({ samples: 2, horizon: 0, steer: 0.3 })
const realEnd = (st: GameState, sd: number) => goalScore(ultimateActivity(finish(st, sd, oracleInner, valuePicker)))
const oracleChooser: Chooser = (st, sd) => {
  const opts = [...options(st), ...(st.openBox === null && canRefresh(st) ? [[{ type: 'refresh' } as const]] : [])]
  let best = opts[0], bv = -1
  for (const o of opts) { const v = realEnd(play(st, ...o), sd); if (v > bv) { bv = v; best = o } }
  return { best, value: Infinity }
}
const oraclePicker: InstrumentPicker = (st, sd) => {
  let best: number | 'refresh' = 0, bv = -1
  for (const c of [...st.hand.map((_, i) => i), ...(canRefresh(st) ? ['refresh' as const] : [])]) {
    const v = realEnd(c === 'refresh' ? play(st, { type: 'refresh' }) : play(st, { type: 'selectCard', index: c }, { type: 'confirm' }), sd)
    if (v > bv) { bv = v; best = c }
  }
  return best
}
const planned = process.env.ORACLE ? oracleChooser : chooser
const chooserWithKit: Chooser = (st, sd) => {
  const r = planned(st, sd)
  const rerolls = r.best[0]?.type === 'refresh' || (st.openBox === null && r.value <= ultimateActivity(st) && st.potionRefreshes > 0)
  const kit = st.openBox === null ? st.hand.findIndex(c => c.kind === 'potion' && typeof potion(c.id)?.targeting === 'object') : -1
  return rerolls && kit >= 0 ? { best: [{ type: 'selectCard', index: kit }, { type: 'confirm' }], value: Infinity } : r
}
const t0 = Date.now()
const out = (o: object, scores: number[], extra: object = {}) =>
  console.log(JSON.stringify({ ...o, policy: pol, ...stats(scores), ...(RAW ? { scores, ...extra } : {}), secs: (Date.now() - t0) / 1000 }))

if (mode === 'real') for (const p of JSON.parse(json) as Plan[]) {
  const scores: number[] = []
  for (let seed = SEED0; seed < SEED0 + N; seed++) scores.push(ultimateActivity(runGame(seed, chooser, planPicker(p))))
  out({ label: p.label }, scores)
}
if (mode === 'board') {
  // INSTR_STEER=<x>: the instrument futures steer toward the instruments too
  const base = boardPicker(Number(json), evChooser({ samples: 4, horizon: 0, steer: Number(process.env.INSTR_STEER ?? 0), value: SMART }), process.env.GOAL === 'mean' ? 'mean' : 'target', Number(process.env.REFRESH_PLAYOUTS ?? json))
  // REFRESH_RULE: an instrument refresh rule to compare. never: never refresh; first-never: not on the first
  // offer; margin:<x>: only when the refresh's value beats the best offer's by the share x
  const rule = process.env.REFRESH_RULE ?? ''
  // LIVE_STATE=1: each instrument pick sees the state as the live advice rebuilds it from the screen (toState:
  // breakpoints guessed from the instruments held, every instrument picked in round 1), to measure what that costs
  const live = (st: GameState): GameState => !process.env.LIVE_STATE ? st : toState({
    tanks: st.tanks.map(t => t && { archetype: t.archetype, rarity: t.rarity, activity: t.activity, quantity: t.quantity }),
    hand: st.hand.map(c => instrument(c.id)!.name), instruments: st.instruments.map(i => instrument(i.id)!.name),
    phase: 'instrument', round: st.round, potionRefreshes: st.potionRefreshes, instrumentRefreshes: st.instrumentRefreshes,
  } as never, [])
  const picker: typeof base = process.env.ORACLE ? oraclePicker : !rule ? (st, sd) => base(live(st), sd) : (st, sd) => {
    st = live(st)
    const { offers, refresh } = rankInstruments(st, sd, Number(json), evChooser({ samples: 4, horizon: 0 }), process.env.GOAL === 'mean' ? 'mean' : 'target', Number(process.env.REFRESH_PLAYOUTS ?? json))
    const best = offers.indexOf(Math.max(...offers))
    if (refresh === null || rule === 'never' || (rule === 'first-never' && st.instruments.length === 0)) return best
    // floor:<x>: commit unless the best offered instrument's predicted final score is under x (a bad game)
    if (rule.startsWith('floor:') && offers[best] >= Number(rule.slice(6))) return best
    // fit:<x>: commit when any offered instrument fits the tanks at least x (its condition's progress; an
    // instrument without a condition always fits); only an offer that fits nothing may be refreshed
    if (rule.startsWith('fit:')) {
      const fits = st.hand.map(c => buildProgress({ ...st, instruments: [{ id: c.id, acquiredRound: 1 }] }))
      if (Math.max(...fits) >= Number(rule.slice(4))) return best
    }
    const margin = rule.startsWith('margin:') ? Number(rule.slice(7)) : 0
    return refresh > offers[best] * (1 + margin) ? 'refresh' : best
  }
  const scores: number[] = []; const decisions: object[] = []
  const board = (s: GameState) => s.tanks.map(t => (t ? `${t.rarity[0]}${t.archetype}` : '-')).join(' ')
  for (let seed = SEED0; seed < SEED0 + N; seed++) {
    const picks: object[] = []; const potions: object[] = []
    // log every potion choice: what was offered, what was played, with which instruments
    const logging: Chooser = (st, sd) => {
      const r = (process.env.KIT_RULE ? chooserWithKit : planned)(st, sd)
      const played = r.best[0]?.type === 'selectCard' ? st.hand[r.best[0].index]?.id : undefined
      potions.push({ round: st.round, have: st.instruments.map(i => i.id), box: st.openBox, offer: st.hand.map(c => c.id), played })
      return r
    }
    const s = runGame(seed, logging, picker, undefined, (st, pick) =>
      picks.push({ round: st.round, have: st.instruments.map(i => i.id), offer: st.hand.map(c => c.id), pick: pick === 'refresh' ? 'refresh' : st.hand[pick].id, board: board(st) }))
    scores.push(ultimateActivity(s))
    decisions.push({ seed, score: ultimateActivity(s), build: s.instruments.map(i => i.id), picks, potions })
  }
  out({ label: `board-aware (${json} playouts)` }, scores, { decisions })
}
if (mode === 'fixed') for (const ids of JSON.parse(json) as number[][]) {
  const scores: number[] = []; const potions: object[] = []
  // with RAW, log every potion choice (offered ids, played id) for the guide's potion lists
  const logging: Chooser = (st, sd) => {
    const r = chooser(st, sd)
    if (RAW) potions.push({ round: st.round, box: st.openBox, offer: st.hand.map(c => c.id), played: r.best[0]?.type === 'selectCard' ? st.hand[r.best[0].index]?.id : undefined })
    return r
  }
  for (let seed = SEED0; seed < SEED0 + N; seed++) {
    const setup = { tanks: null, instruments: ids.map(id => ({ id, acquiredRound: 1 })), startRound: 1, thresholdsUsed: { t8000: ids.length > 1, t28000: ids.length > 2 }, forcedHand: [], seed }
    scores.push(ultimateActivity(runGame(seed, logging, undefined, setup)))
  }
  out({ label: ids.map(i => instrument(i)!.name).join(' + '), ids }, scores, { potions })
}
