// One line per smarter-player run in data/sim/smarter-history.jsonl, so whether the player got better can always
// be looked up: the shipped board value and the challenger on all the gate's games, and on the 240 fixed ones
// alone (the same games every run, so runs compare with each other; the other 240 are new each day).
// Usage: [DATE=<yyyy-mm-dd>] RUN=<id> ODDS=<date> SHIPPED=<commit> vite-node scripts/sim/smarterHistory.ts <champion dir> <challenger dir> <history.jsonl>
import { appendFileSync } from 'node:fs'
import { decide, load, type Game } from './gateLib'

/** The fixed games' seeds start at 1,000,000, the new ones at 2,000,000 (the workflow's gate job). */
const FRESH = 2_000_000

export function summary(champion: Game[], challenger: Game[]) {
  const side = (s: { reached: number; average: number }) => ({ reached: s.reached, average: Math.round(s.average) })
  const of = (keep: (g: Game) => boolean) => {
    const d = decide(champion.filter(keep), challenger.filter(keep))
    return { games: d.games, shipped: side(d.champion), challenger: side(d.challenger), gained: d.gained, lost: d.lost, luck: Math.round(d.luck * 1000) / 1000 }
  }
  return { pass: decide(champion, challenger).pass, all: of(() => true), fixed: of(g => g.seed < FRESH) }
}

if (!process.env.VITEST) {
  const [, , champDir, chalDir, out] = process.argv
  const line = { date: process.env.DATE ?? new Date().toISOString().slice(0, 10), run: process.env.RUN ?? null, odds: process.env.ODDS ?? null, shipped: process.env.SHIPPED ?? null, ...summary(load(champDir), load(chalDir)) }
  appendFileSync(out, JSON.stringify(line) + '\n')
  console.log(JSON.stringify(line))
}
