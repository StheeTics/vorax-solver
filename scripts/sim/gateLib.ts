// The gate a new board value (the challenger) must pass to be proposed: game by game against the one shipped (the
// champion), more games reaching 900,000 by a clear margin, and the average counted up to 900,000 not lower.
// The decision itself, for gate.ts and smarterHistory.ts.
import { readdirSync, readFileSync } from 'node:fs'

export interface Game { seed: number; score: number }
const TARGET = 900_000
/** At least this many more games must reach 900,000 (net), or 1% of the games if that's more. */
const MARGIN = 5
/** The average counted up to 900,000 may be at most this much lower. */
const SLACK = 5_000

const cap = (x: number) => Math.min(x, TARGET)

/** Chance that a split at least this uneven of the games one reached and the other didn't comes by luck. */
function luck(gained: number, lost: number): number {
  const n = gained + lost, k = Math.min(gained, lost)
  if (!n) return 1
  let tail = 0, c = 1
  for (let i = 0; i <= k; i++) { tail += c; c = (c * (n - i)) / (i + 1) }
  return Math.min(1, (2 * tail) / 2 ** n)
}

export function decide(champion: Game[], challenger: Game[]) {
  const a = new Map(champion.map(g => [g.seed, g.score]))
  const both = challenger.filter(g => a.has(g.seed)).map(g => ({ seed: g.seed, a: a.get(g.seed)!, b: g.score }))
  const n = both.length
  const side = (pick: (g: (typeof both)[number]) => number) => ({
    reached: both.filter(g => pick(g) >= TARGET).length,
    average: both.reduce((t, g) => t + cap(pick(g)), 0) / Math.max(1, n),
  })
  const champ = side(g => g.a), chal = side(g => g.b)
  const gained = both.filter(g => g.b >= TARGET && g.a < TARGET).length
  const lost = both.filter(g => g.a >= TARGET && g.b < TARGET).length
  const pass = n > 0 && gained - lost >= Math.max(MARGIN, Math.ceil(n / 100)) && chal.average >= champ.average - SLACK
  return { pass, games: n, champion: champ, challenger: chal, gained, lost, luck: luck(gained, lost) }
}

export const load = (dir: string): Game[] =>
  readdirSync(dir).filter(f => f.endsWith('.jsonl')).flatMap(f => readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter(Boolean))
    .flatMap(l => (JSON.parse(l).decisions ?? []).map((d: Game) => ({ seed: d.seed, score: d.score })))
