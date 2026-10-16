// Targeted test: which basic instrument is best for which starting board?
// Each random round-1 start is offered all 8 basics; each is scored by `playouts` full games from that board.
// Usage: vite-node scripts/sim/offers.ts <boards> <playouts>   (SEED0 picks the boards)
import { createGame, DEFAULT_SETTINGS } from '@/engine/game'
import { evChooser, rankInstruments } from '@/strategy/bot'

const [, , nArg, pArg] = process.argv
const N = Number(nArg); const P = Number(pArg); const SEED0 = Number(process.env.SEED0 ?? 3_000_000)
const BASICS = [1, 2, 3, 4, 5, 6, 7, 8]
const rollout = evChooser({ samples: 4, horizon: 0 })
for (let seed = SEED0; seed < SEED0 + N; seed++) {
  const g = createGame({ ...DEFAULT_SETTINGS, instrumentRefreshes: 0 }, undefined, seed)
  const s = { ...g, hand: BASICS.map(id => ({ kind: 'instrument' as const, id })), instrumentRefreshes: 0 }
  const { offers } = rankInstruments(s, seed, P, rollout)
  const board = s.tanks.filter(t => t !== null).map(t => ({ a: t!.archetype, r: t!.rarity }))
  console.log(JSON.stringify({ seed, board, values: Object.fromEntries(BASICS.map((id, i) => [id, Math.round(offers[i])])) }))
}
