// Strategy bots for Surgical Preparation. Every policy judges a move by its *expected* payoff:
// the move is replayed under K fresh random outcomes (the real RNG state is never peeked at)
// and the outcomes are averaged.
import { createGame, dispatch, ultimateActivity, needsTargets, canRefresh, DEFAULT_SETTINGS } from '@/engine/game'
import type { GameState, Action, SandboxSetup } from '@/engine/types'
import { VIAL_LEVELS } from '@/engine/rewards'
import { BASIC_POOL, INSTRUMENTS } from '@/data/instruments'
import STRENGTH from '@/data/instrumentStrength.json'

export const play = (s: GameState, ...a: Action[]) => a.reduce((x, y) => dispatch(x, y).state, s)

/** Every way to play the current hand: [select, ...targets, confirm]. */
export function options(s: GameState): Action[][] {
  const out: Action[][] = []
  s.hand.forEach((_, i) => {
    const sel = play(s, { type: 'selectCard', index: i })
    const mode = needsTargets(sel)
    const tanks = sel.tanks.flatMap((t, k) => (t ? [k] : []))
    const pick: Action = { type: 'selectCard', index: i }
    if (!mode) out.push([pick, { type: 'confirm' }])
    else {
      for (const t of tanks) out.push([pick, { type: 'toggleTarget', tank: t }, { type: 'confirm' }])
      if (mode === 'select1to2')
        for (const a of tanks) for (const b of tanks) if (a < b) out.push([pick, { type: 'toggleTarget', tank: a }, { type: 'toggleTarget', tank: b }, { type: 'confirm' }])
    }
  })
  return out
}

const reseed = (s: GameState, seed: number): GameState => ({ ...s, rngState: seed >>> 0 })
const mix = (a: number, b: number) => (Math.imul(a ^ (b + 0x9e3779b9), 0x85ebca6b) ^ (a >>> 13)) >>> 0

export interface Policy {
  /** fresh random outcomes averaged per option */
  samples: number
  /** remaining rounds played by a cheap rollout after the move (0 = judge on this round's result) */
  horizon: number
  /** fresh outcomes averaged per option inside the rollout (1 = judge on a single outcome) */
  rollSamples?: number
}

/** Score of a state after resolving any open box the best way (by expectation, recursively). */
function settle(s: GameState, p: Policy, seed: number, depth: number): number {
  if (s.phase === 'potionSelect' && s.openBox !== null && depth < 2) {
    let best = -1
    for (const o of options(s)) best = Math.max(best, expected(s, o, p, seed, depth + 1))
    return best
  }
  return rollout(s, p.horizon, seed, p.rollSamples ?? 1)
}

/** Open a box (if any) and take its first card; only used inside rollouts. */
const resolveBox = (n: GameState) => (n.phase === 'potionSelect' && n.openBox !== null ? play(n, ...options(n)[0]) : n)

/**
 * Lookahead: play `rounds` more rounds. Each round's card is the one with the best mean over
 * `samples` fresh outcomes (common seeds across options); the round then plays out on one more fresh outcome.
 */
function rollout(s: GameState, rounds: number, seed: number, samples: number): number {
  for (let r = 0; r < rounds && s.phase !== 'gameOver'; r++) {
    if (s.phase === 'roundEnd') { s = play(s, { type: 'confirm' }); continue }
    if (s.phase === 'instrumentSelect') { s = play(s, { type: 'selectCard', index: priorPick(s) }, { type: 'confirm' }); continue }
    let best = options(s)[0], bv = -1
    for (const o of options(s)) {
      let v = 0
      for (let k = 0; k < samples; k++) v += ultimateActivity(resolveBox(play(reseed(s, mix(seed, r * 977 + k)), ...o)))
      if (v > bv) { bv = v; best = o }
    }
    s = resolveBox(play(reseed(s, mix(seed, r * 977 + 500)), ...best))
  }
  return ultimateActivity(s)
}

/** Mean payoff of playing option `o`, over p.samples fresh outcomes (common seeds across options). */
export function expected(s: GameState, o: Action[], p: Policy, seed: number, depth = 0): number {
  // a box's contents are judged with fewer samples, or nested boxes blow up K × K × options
  const n = depth === 0 ? p.samples : Math.max(2, p.samples >> 2)
  let sum = 0
  for (let k = 0; k < n; k++) {
    const sk = mix(seed, k + 1 + depth * 101)
    sum += settle(play(reseed(s, sk), ...o), p, sk, depth)
  }
  return sum / n
}

/** Best option by expected payoff; also returns its value and the value of the current board. */
export function choose(s: GameState, p: Policy, seed: number) {
  const slim = { ...s, log: [] }
  let best: Action[] = [], bv = -Infinity
  for (const o of options(slim)) {
    const v = expected(slim, o, p, seed)
    if (v > bv) { bv = v; best = o }
  }
  return { best, value: bv }
}

/** Old bot: judged each move on the game's own next random outcome (it could see the dice). */
export function choosePeek(s: GameState) {
  const value = (x: GameState, d = 0): number =>
    x.phase === 'potionSelect' && x.openBox !== null && d < 2 ? Math.max(...options(x).map(o => value(play(x, ...o), d + 1))) : ultimateActivity(x)
  let best: Action[] = [], bv = -1
  for (const o of options(s)) { const v = value(play(s, ...o)); if (v > bv) { bv = v; best = o } }
  return { best, value: bv }
}

export interface Plan { label: string; basic: number; adv: number[] }
/** basics in general strength order, used when the wanted basic never shows */
export const BASIC_FALLBACK = [2, 6, 4, 7, 1, 3, 8, 5]

export type Chooser = (s: GameState, seed: number) => { best: Action[]; value: number }
export const evChooser = (p: Policy): Chooser => (s, seed) => choose(s, p, seed)
export const peekChooser: Chooser = s => choosePeek(s)

/**
 * Strength of each instrument by id, from src/data/instrumentStrength.json (scripts/sim/strength.sh, rerun
 * by the strengths workflow whenever the odds change). Only used for instrument picks *inside* playouts,
 * where a full board-aware pick would be too slow.
 */
export const PRIOR: Record<number, number> = Object.fromEntries(INSTRUMENTS.map(d => [d.id, (STRENGTH.strength as Record<string, number>)[d.name] ?? 0]))
const priorPick = (s: GameState) => s.hand.reduce((b, c, i) => ((PRIOR[c.id] ?? 0) > (PRIOR[s.hand[b].id] ?? 0) ? i : b), 0)

const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a[a.length >> 1] }
const BASIC_IDS = new Set(BASIC_POOL.map(d => d.id))
const MEDIAN_PRIOR = {
  basic: median(Object.entries(PRIOR).filter(([id]) => BASIC_IDS.has(+id)).map(([, v]) => v)),
  advanced: median(Object.entries(PRIOR).filter(([id]) => !BASIC_IDS.has(+id)).map(([, v]) => v)),
}

/** Inside playouts: the strongest offered instrument, but a below-median offer is refreshed while refreshes last. */
export const refreshingPriorPicker: InstrumentPicker = s => {
  const i = priorPick(s)
  const pool = BASIC_IDS.has(s.hand[i].id) ? 'basic' : 'advanced'
  return (PRIOR[s.hand[i].id] ?? 0) < MEDIAN_PRIOR[pool] && canRefresh(s) ? 'refresh' : i
}

export const RAINBOW = VIAL_LEVELS[VIAL_LEVELS.length - 1]
/**
 * A final score as the goal sees it: rainbow is worth far more than anything short of it (and more
 * than rainbow is worth nothing), else the number of vial steps reached. Averaged over playouts this
 * is the chance of rainbow first, then the vial tier reached.
 */
export const rainbowScore = (ua: number) => (ua >= RAINBOW ? 100 : VIAL_LEVELS.filter(v => ua >= v).length)

/** How an instrument offer is answered: return a hand index, or 'refresh'. */
export type InstrumentPicker = (s: GameState, seed: number) => number | 'refresh'

/** Fixed wish list (the old way): refresh until a wanted instrument shows, ignoring the board. */
export const planPicker = (plan: Plan): InstrumentPicker => s => {
  const ids = s.hand.map(c => c.id)
  const basicStage = s.instruments.length === 0
  const wish = basicStage ? [plan.basic] : plan.adv
  if (!wish.some(w => ids.includes(w)) && canRefresh(s)) return 'refresh'
  const order = basicStage ? [...wish, ...BASIC_FALLBACK] : [...wish, ...ids]
  return ids.indexOf(order.find(w => ids.includes(w))!)
}
export const priorPicker: InstrumentPicker = s => priorPick(s)

/**
 * Board-aware: each offered instrument (and a refresh) is played out to the end of the game
 * `playouts` times from the current board; the best average final score wins.
 * Playouts use common seeds across options so the comparison is fair.
 */
/**
 * What an instrument choice is judged by. 'rainbow' (the advice): the goal score, with weak offers
 * refreshed inside playouts so a refresh kept has a value. 'mean': the old way, average final score,
 * and playouts never refresh (which made spending a refresh look free).
 */
export type Goal = 'rainbow' | 'mean'

/** offers/refresh: mean goal value per option; rainbow/refreshRainbow: the share of its playouts that reached rainbow */
export function rankInstruments(s: GameState, seed: number, playouts: number, rollout: Chooser, goal: Goal = 'rainbow'): { offers: number[]; refresh: number | null; rainbow: number[]; refreshRainbow: number | null } {
  const slim = { ...s, log: [] }
  const picker = goal === 'rainbow' ? refreshingPriorPicker : priorPicker
  const value = goal === 'rainbow' ? (x: GameState) => rainbowScore(ultimateActivity(x)) : ultimateActivity
  const score = (first: (x: GameState) => GameState) => {
    let sum = 0, rainbows = 0
    for (let k = 0; k < playouts; k++) {
      const sk = mix(seed, 7000 + k)
      const end = finish(first(reseed(slim, sk)), sk, rollout, picker)
      sum += value(end)
      if (ultimateActivity(end) >= RAINBOW) rainbows++
    }
    return { mean: sum / playouts, rainbow: rainbows / playouts }
  }
  const each = slim.hand.map((_, i) => score(x => play(x, { type: 'selectCard', index: i }, { type: 'confirm' })))
  const r = canRefresh(slim) ? score(x => play(x, { type: 'refresh' })) : null
  return { offers: each.map(e => e.mean), refresh: r && r.mean, rainbow: each.map(e => e.rainbow), refreshRainbow: r && r.rainbow }
}

export const boardPicker = (playouts: number, rollout: Chooser, goal: Goal = 'rainbow'): InstrumentPicker => (s, seed) => {
  const { offers, refresh } = rankInstruments(s, seed, playouts, rollout, goal)
  const best = offers.indexOf(Math.max(...offers))
  return refresh !== null && refresh > offers[best] ? 'refresh' : best
}

/** Play a game on from state `s` to the end. */
export function finish(s: GameState, seed: number, chooser: Chooser, picker: InstrumentPicker, onPick?: (s: GameState, pick: number | 'refresh') => void): GameState {
  for (let g = 0; g < 300 && s.phase !== 'gameOver'; g++) {
    s = { ...s, log: [] }
    if (s.phase === 'roundEnd') { s = play(s, { type: 'confirm' }); continue }
    if (s.phase === 'instrumentSelect') {
      const pick = picker(s, mix(seed, 5000 + g))
      onPick?.(s, pick)
      s = pick === 'refresh' ? play(s, { type: 'refresh' }) : play(s, { type: 'selectCard', index: pick }, { type: 'confirm' })
      continue
    }
    const { best, value } = chooser(s, mix(seed, g))
    // refresh a potion hand only when nothing in it is expected to beat the current board
    if (s.openBox === null && value <= ultimateActivity(s) && canRefresh(s)) { s = play(s, { type: 'refresh' }); continue }
    s = play(s, ...best)
  }
  return s
}

/**
 * One game. `setup` given = sandbox with fixed instruments from round 1 (pair/trio sweeps).
 * No setup = realistic: everything dealt, refreshes used like a player would.
 */
export function runGame(seed: number, chooser: Chooser, picker: InstrumentPicker = priorPicker, setup?: SandboxSetup, onPick?: (s: GameState, pick: number | 'refresh') => void): GameState {
  return finish(createGame(DEFAULT_SETTINGS, setup, seed), seed, chooser, picker, onPick)
}

export function stats(xs: number[]) {
  const a = [...xs].sort((x, y) => x - y); const n = a.length; const m = a.reduce((p, c) => p + c, 0) / n
  const sd = Math.sqrt(a.reduce((p, c) => p + (c - m) ** 2, 0) / Math.max(1, n - 1))
  return { n, mean: Math.round(m), ci95: Math.round(1.96 * sd / Math.sqrt(n)), median: a[n >> 1], p10: a[Math.floor(n * 0.1)], p90: a[Math.floor(n * 0.9)], rainbowPct: +(100 * a.filter(x => x >= 1_120_000).length / n).toFixed(1) }
}
