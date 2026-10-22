// The gate a new board value (the challenger) must pass to be proposed (gateLib.ts): game by game against the one
// shipped (the champion), more games reaching 900,000 by a clear margin, and the average counted up to 900,000 not lower.
// Usage: vite-node scripts/sim/gate.ts <champion dir> <challenger dir> <report.md>
//   dirs of run.ts RAW=1 output (.jsonl); prints pass=yes or pass=no last (the workflow reads it).
import { writeFileSync } from 'node:fs'
import { decide, load } from './gateLib'

export { decide, type Game } from './gateLib'

// run as a script (vite-node), not when the tests import decide()
if (!process.env.VITEST) {
  const [, , champDir, chalDir, out] = process.argv
  const d = decide(load(champDir), load(chalDir))
  const pct = (x: number) => `${((100 * x) / Math.max(1, d.games)).toFixed(1)}%`
  const report = [
    `| ${d.games} simulated games | Shipped board value | New board value |`,
    '|---|---|---|',
    `| Reached 900,000 | ${d.champion.reached} (${pct(d.champion.reached)}) | ${d.challenger.reached} (${pct(d.challenger.reached)}) |`,
    `| Average, counted up to 900,000 | ${Math.round(d.champion.average).toLocaleString('en-US')} | ${Math.round(d.challenger.average).toLocaleString('en-US')} |`,
    '',
    `Game by game, the new one reached 900,000 in ${d.gained} ${d.gained === 1 ? 'game' : 'games'} the shipped one didn't, and missed ${d.lost} it reached (chance of a split like this by luck: ${(100 * d.luck).toFixed(1)}%).`,
    d.pass ? 'It passes the gate: clearly more games reach 900,000, and the average isn\'t lower.' : 'It doesn\'t pass the gate.',
  ].join('\n')
  writeFileSync(out, report + '\n')
  console.log(report)
  console.log(`pass=${d.pass ? 'yes' : 'no'}`)
}
