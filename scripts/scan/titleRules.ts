// Tries the rules that settle a card's name on titles already read (scripts/scan/titleTexts.ts): for each card,
// which step settles it, as readTitle (titles.ts) takes them, and whether the name is right. Prints still and
// raised cards apart, with every wrong name. Uses titles.ts's own rules, so a change there is measured directly.
// Usage: npx vite-node scripts/scan/titleRules.ts <texts.json> [more.json ...]
import { readFileSync } from 'node:fs'
import { ranked, settled, wholeName } from '../../src/solver/scan/titles'
import type { HandPhase } from '../../src/solver/scan/data'

type Row = { file: string; slot: number; name: string; phase: HandPhase; hover: boolean; blurred: boolean; texts: (string | null)[] }
const args = process.argv.slice(2)
const rows = args.filter(a => a.endsWith('.json')).flatMap(f => JSON.parse(readFileSync(f, 'utf8')) as Row[])

/** As readTitle: step 1 a whole name that settles, steps 2 and 3 a settled name, else 4 with the best read. */
function steps(r: Row): { step: number; name: string | null } {
  const [w, half, full] = r.texts
  if (w !== null) {
    const n = settled(ranked(r.phase, w)) ? wholeName(r.phase, w) : null
    if (n !== null) return { step: 1, name: n }
  }
  for (const [step, t] of [[2, half], [3, full]] as const) {
    const rk = ranked(r.phase, t ?? '')
    if (settled(rk)) return { step, name: rk[0][0] }
  }
  return { step: 4, name: null }
}

for (const [label, set] of [['still', rows.filter(r => !r.hover && !r.blurred)], ['raised', rows.filter(r => r.hover)]] as const) {
  const got = set.map(r => ({ r, ...steps(r) }))
  const count = (s: number) => got.filter(g => g.step === s).length
  const wrong = got.filter(g => g.name !== null && g.name !== g.r.name)
  console.log(`\n== ${label}: ${set.length} cards; step 1 ${count(1)}, step 2 ${count(2)}, step 3 ${count(3)}, none ${count(4)}; wrong ${wrong.length}`)
  for (const g of wrong) console.log(`  WRONG step ${g.step}: ${g.r.file} card${g.r.slot} read ${g.name}, is ${g.r.name} | ${(g.r.texts[g.step - 1] ?? '').replace(/\n+/g, ' / ').slice(0, 80)}`)
  // the cards that most often miss step 1
  const miss = new Map<string, [number, number]>()
  for (const g of got) {
    const m = miss.get(g.r.name) ?? [0, 0]
    m[1]++
    if (g.step > 1) m[0]++
    miss.set(g.r.name, m)
  }
  console.log('  past step 1 most often: ' + [...miss].filter(([, m]) => m[0] > 0).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1]).slice(0, 12).map(([n, m]) => `${n} ${m[0]}/${m[1]}`).join('; '))
}
