// Live advice for the Solver: given what is on screen, rank the choices by expected payoff.
import { XENOPANACEA, isXenopanacea } from '@/data/xenopanacea'
import { POTIONS } from '@/data/potions'
import { INSTRUMENTS } from '@/data/instruments'
import { createGame, DEFAULT_SETTINGS, ultimateActivity } from '@/engine/game'
import type { Action, Archetype, Card, GameState, Monster, Rarity } from '@/engine/types'
import { settingsForShelley } from '@/data/shelley'
import { evChooser, expected, lookAhead, options, rankInstruments } from './bot'

export interface ScreenMonster { archetype: Archetype; rarity: Rarity; activity: number; quantity: number }
export interface ScreenState {
  /** 6 entries, left to right; null = empty tank */
  tanks: (ScreenMonster | null)[]
  /** card names as printed, left to right */
  hand: string[]
  /** names of equipped instruments */
  instruments: string[]
  /** 'potion' while choosing a potion, 'instrument' while choosing an instrument, 'protocol' in rounds 11-13 */
  phase: 'potion' | 'instrument' | 'protocol'
  round?: number
  potionRefreshes?: number
  instrumentRefreshes?: number
  /** Intern Shelley level; DEFAULT_SETTINGS when absent */
  shelley?: number
}
/** end: with look-ahead, the predicted end of the run (average final Ultimate Activity counted up to 950,000; share reaching 950,000, which counts as rainbow) */
export interface Ranked { index: number; targets: number[]; value: number; end?: { activity: number; reached: number } }
export interface Advice {
  /** best card (hand index) and the tanks to target, a refresh, or null when the choice doesn't change the score */
  best: Ranked | 'refresh' | null
  /** every option, best first (potion phase), or one entry per offered instrument */
  ranking: Ranked[]
  board: number
  /** with look-ahead and rerolls left: the predicted end of the run after a reroll, like a card's `end` */
  refreshEnd?: Ranked['end']
  /** true: potions judged by look-ahead to the end of the run (values: predicted final score); false: expected score after this round */
  plan: boolean
  /** no better answer is coming for this screen */
  final: boolean
  ms: number
  unknown: string[]
  /** a rule decided the advice rather than simulation: shown instead of values */
  note?: string
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const potionIds = new Map(POTIONS.map(p => [norm(p.name), p.id]))
const instrumentIds = new Map(INSTRUMENTS.map(i => [norm(i.name), i.id]))

/** Every card and instrument name the reader should know about. */
export function names() {
  return { potions: [...POTIONS.map(p => p.name), ...XENOPANACEA], instruments: INSTRUMENTS.map(i => i.name), basics: INSTRUMENTS.filter(i => i.pool === 'basic').map(i => i.name) }
}

export function toState(x: ScreenState, unknown: string[]): GameState {
  const lookup = (m: Map<string, number>, n: string) => { const id = m.get(norm(n)); if (id === undefined) unknown.push(n); return id }
  const equipped = x.instruments.map(n => lookup(instrumentIds, n)).filter((id): id is number => id !== undefined)
  const settings = x.shelley === undefined ? DEFAULT_SETTINGS : settingsForShelley(x.shelley)
  const s = createGame(settings, { tanks: null, instruments: [], startRound: 1, thresholdsUsed: { t8000: false, t28000: false }, forcedHand: [] }, 1)
  const ids = x.hand.map(n => lookup(x.phase === 'potion' ? potionIds : instrumentIds, n))
  const hand: Card[] = ids.filter((id): id is number => id !== undefined).map(id => ({ kind: x.phase === 'potion' ? 'potion' : 'instrument', id }))
  const round = x.round ?? 1
  return {
    ...s,
    tanks: x.tanks.map(t => (t ? ({ ...t } as Monster) : null)),
    instruments: equipped.map(id => ({ id, acquiredRound: 1 })),
    round,
    phase: x.phase === 'potion' ? 'potionSelect' : 'instrumentSelect',
    hand,
    potionRefreshes: x.potionRefreshes ?? 0,
    instrumentRefreshes: x.instrumentRefreshes ?? 0,
    // past thresholds only matter for whether more instruments are coming; infer from what's equipped
    thresholds: { t8000: equipped.length >= 2, t28000: equipped.length >= 3 },
    log: [],
  }
}

/** Potion look-ahead: each card on offer, the next best options up to 4, and a reroll, each played to the end of the run 32 times;
 *  the rounds inside steer toward what the instruments need (steer 0.3: 50% reached 950k in 240 games against 47% without, within luck). (Judged by
 *  rainbow points, it reached 1,120,000 in 22.9% of 240 simulated games against 13.8% for this round's score alone.) */
export const LOOK_AHEAD = { top: 4, playouts: 32, steer: 0.3 }

/** A few rounds of look-ahead, only to order options that score the same this round. */
const TIE_BREAK = { samples: 32, horizon: 4 }

/**
 * Options tied with the best this round (say, the same potion on two equal tanks) are put in order by
 * playing a few more rounds, so the board the build needs (two Bone Sentries for Adherent Metatarsals)
 * isn't given up on a coin flip.
 */
function breakTies(s: GameState, ranking: Ranked[], seed: number): Ranked[] {
  const tied = ranking.filter(r => r.value === ranking[0]?.value)
  if (tied.length < 2) return ranking
  const toAction = (r: Ranked) => [{ type: 'selectCard', index: r.index } as const, ...r.targets.map(tank => ({ type: 'toggleTarget', tank }) as const), { type: 'confirm' } as const]
  const ahead = new Map(tied.map(r => [r, expected(s, toAction(r), TIE_BREAK, seed)]))
  return [...tied.sort((a, b) => ahead.get(b)! - ahead.get(a)!), ...ranking.slice(tied.length)]
}

/**
 * Rank the current choices. `samples`: fresh outcomes per potion option; `playouts`: games per instrument option.
 * `plan`: judge potions by how the run ends (lookAhead, ~0.3-1 s) instead of this round's score (~10 ms).
 */
export function advise(x: ScreenState, samples = 16, playouts = 16, plan = false): Advice {
  const t0 = Date.now(); const unknown: string[] = []
  // Surgical Protocols change the endgame battle, not Ultimate Activity
  if (x.phase === 'protocol') return { best: null, ranking: [], board: 0, plan: false, final: true, ms: 0, unknown }
  // a Xenopanacea is always taken: its effect isn't simulated, and it's worth more than anything beside it
  const xeno = x.phase === 'potion' ? x.hand.findIndex(isXenopanacea) : -1
  if (xeno >= 0) {
    const pick = { index: xeno, targets: [], value: 0 }
    return { best: pick, ranking: [pick], board: ultimateActivity(toState({ ...x, hand: [] }, [])), plan: false, final: true, ms: Date.now() - t0, unknown, note: 'A Xenopanacea: always take it when it’s offered.' }
  }
  const s = toState(x, unknown)
  const seed = 0x5eed
  let ranking: Ranked[]
  let best: Advice['best']
  let refreshEnd: Advice['refreshEnd']
  if (s.phase === 'potionSelect') {
    const toRanked = (o: Action[], value: number): Ranked => ({
      index: (o[0] as { index: number }).index,
      targets: o.flatMap(a => (a.type === 'toggleTarget' ? [a.tank] : [])),
      value,
    })
    if (plan) {
      const ahead = lookAhead(s, seed, LOOK_AHEAD)
      const reroll = ahead.find(a => a.o[0].type === 'refresh')
      if (reroll) refreshEnd = { activity: reroll.goal, reached: reroll.reached }
      ranking = ahead.filter(a => a !== reroll).map(a => ({ ...toRanked(a.o, Math.round(a.goal)), end: { activity: a.goal, reached: a.reached } }))
      best = ahead[0] === reroll ? 'refresh' : ranking[0]
    } else {
      ranking = breakTies(s, options(s).map(o => toRanked(o, Math.round(expected(s, o, { samples, horizon: 0 }, seed)))).sort((a, b) => b.value - a.value), seed)
      best = ranking[0] && !(ranking[0].value <= ultimateActivity(s) && s.potionRefreshes > 0) ? ranking[0] : 'refresh'
    }
  } else {
    // judged by the average final score: the goal rule ('target') isn't proven better for instruments yet
    const { offers, refresh } = rankInstruments(s, seed, playouts, evChooser({ samples: 4, horizon: 0 }), 'mean')
    ranking = offers.map((v, index) => ({ index, targets: [], value: Math.round(v) })).sort((a, b) => b.value - a.value)
    best = refresh !== null && refresh > ranking[0].value ? 'refresh' : ranking[0]
  }
  plan = plan && s.phase === 'potionSelect'
  return { best, ranking, board: ultimateActivity(s), plan, final: plan || s.phase !== 'potionSelect', ms: Date.now() - t0, unknown, refreshEnd }
}
