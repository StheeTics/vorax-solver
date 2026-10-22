import { INSTRUMENTS } from '@/data/instruments'
import { dispatch, DEFAULT_SETTINGS, createGame, LAST_ROUND, ultimateActivity } from './game'
import type { Monster } from './types'

const ids = new Map(INSTRUMENTS.map(d => [d.name.toLowerCase(), d.id]))

/**
 * The final score of a game seen on its round-13 board: the instruments fire one last time when round 13 ends,
 * after the board is read (Chrysalis Specimen every time; Lady of the Plague Quarter when its two rounds land
 * on 13). Instruments that pick at random are averaged over `seeds` endings. `rounds`: the round each
 * instrument was picked (1 when unknown).
 */
export function finalScore(tanks: (Monster | null)[], instruments: string[], rounds: number[] = [], seeds = 8): number {
  const equipped = instruments.flatMap((n, i) => {
    const id = ids.get(n.toLowerCase())
    return id === undefined ? [] : [{ id, acquiredRound: rounds[i] || 1 }]
  })
  let sum = 0
  for (let seed = 1; seed <= seeds; seed++) {
    const s = createGame(DEFAULT_SETTINGS, { tanks: tanks.map(t => (t ? { ...t } : null)), instruments: equipped, startRound: LAST_ROUND, thresholdsUsed: { t8000: true, t28000: true }, forcedHand: [], seed }, seed)
    sum += ultimateActivity(dispatch(s, { type: 'confirm' }).state)
  }
  return Math.round(sum / seeds)
}
