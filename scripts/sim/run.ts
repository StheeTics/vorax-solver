// Usage: vite-node scripts/sim/run.ts <games> <policy> <mode> <json>
//   policy: peek | ev:<samples>:<horizon>[:<rollSamples>] | plan:<top>:<playouts> (potions judged by how the run ends)
//   mode:   real  <Plan[]>      everything dealt; instruments by the plan's fixed wish list
//           board <number>      everything dealt; instruments picked from the board (<number> playouts per option)
//           fixed <number[][]>  listed instruments equipped from round 1
// GOAL=mean judges instrument picks by the average final score (the old way) instead of the rainbow goal.
// RAW=1 adds per-game scores (and, in board mode, every instrument decision) for merge.py.
import { instrument } from '@/data/instruments'
import { ultimateActivity } from '@/engine/game'
import type { GameState } from '@/engine/types'
import { runGame, stats, evChooser, peekChooser, planChooser, planPicker, boardPicker, type Plan, type Chooser } from '@/strategy/bot'

const [, , nArg, pol, mode, json] = process.argv
const N = Number(nArg); const SEED0 = Number(process.env.SEED0 ?? 1_000_000); const RAW = !!process.env.RAW
const chooser: Chooser = pol === 'peek' ? peekChooser : pol.startsWith('plan:') ? (() => { const [, top, playouts] = pol.split(':').map(Number); return planChooser({ top, playouts }) })() : (() => { const [, k, h, r] = pol.split(":").map(Number); return evChooser({ samples: k, horizon: h, rollSamples: r || 1 }) })()
const t0 = Date.now()
const out = (o: object, scores: number[], extra: object = {}) =>
  console.log(JSON.stringify({ ...o, policy: pol, ...stats(scores), ...(RAW ? { scores, ...extra } : {}), secs: (Date.now() - t0) / 1000 }))

if (mode === 'real') for (const p of JSON.parse(json) as Plan[]) {
  const scores: number[] = []
  for (let seed = SEED0; seed < SEED0 + N; seed++) scores.push(ultimateActivity(runGame(seed, chooser, planPicker(p))))
  out({ label: p.label }, scores)
}
if (mode === 'board') {
  const picker = boardPicker(Number(json), evChooser({ samples: 4, horizon: 0 }), process.env.GOAL === 'mean' ? 'mean' : 'rainbow')
  const scores: number[] = []; const decisions: object[] = []
  const board = (s: GameState) => s.tanks.map(t => (t ? `${t.rarity[0]}${t.archetype}` : '-')).join(' ')
  for (let seed = SEED0; seed < SEED0 + N; seed++) {
    const picks: object[] = []; const potions: object[] = []
    // log every potion choice: what was offered, what was played, with which instruments
    const logging: Chooser = (st, sd) => {
      const r = chooser(st, sd)
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
