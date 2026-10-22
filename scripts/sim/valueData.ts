// Training games for the board value (src/strategy/value.ts): every board along the way, with how its game ended
// (the final score counted up to the target, 900,000, in millions), summed per round as XᵀX, Xᵀy, yᵀy and n for a least-squares
// fit (valueFit.ts), so the file stays small however many games are played.
// Usage: vite-node scripts/sim/valueData.ts <games> <out.bin>
//   SEED0: first game's seed. EPS: share of moves played at random, so boards a better player reaches are seen too
//   (default 0.1). VALUE_MODEL=<json>: the games' player judges by that board value (a second pass), else by score.
//   ROWS=1: instead, every board's treeFeatures and its game's ending, as float32 rows, for the decision trees (treeFit.ts).
import { readFileSync, writeFileSync } from 'node:fs'
import { createGame, DEFAULT_SETTINGS, canRefresh, ultimateActivity } from '@/engine/game'
import { createRng } from '@/engine/rng'
import { evChooser, goalScore, mix, options, play, valuePicker } from '@/strategy/bot'
import { features, FEATURE_NAMES, setBoardValue, treeFeatures, TREE_FEATURES } from '@/strategy/value'

const [, , nArg, out] = process.argv
const N = Number(nArg), SEED0 = Number(process.env.SEED0 ?? 5_000_000), EPS = Number(process.env.EPS ?? 0.1)
const smart = !!process.env.VALUE_MODEL
// without a board value, boards (instrument offers too) are judged by their score
setBoardValue(smart ? JSON.parse(readFileSync(process.env.VALUE_MODEL!, 'utf8')) : null)
const chooser = evChooser({ samples: 2, horizon: 0, steer: 0.3, value: smart })
const picker = valuePicker

const F = FEATURE_NAMES.length, R = 13
const xtx = new Float64Array(R * F * F), xty = new Float64Array(R * F), yy = new Float64Array(R), n = new Float64Array(R)
const ROWS = !!process.env.ROWS
const rowsOut: number[] = []
const t0 = Date.now()
for (let seed = SEED0; seed < SEED0 + N; seed++) {
  let s = createGame(DEFAULT_SETTINGS, undefined, seed)
  const rng = createRng(mix(seed, 0xbeef))
  const rows: [number, number[]][] = []
  for (let g = 0; g < 300 && s.phase !== 'gameOver'; g++) {
    s = { ...s, log: [] }
    if (s.phase !== 'potionSelect' || s.openBox === null) rows.push([s.round, ROWS ? treeFeatures(s) : features(s)])
    if (s.phase === 'roundEnd') { s = play(s, { type: 'confirm' }); continue }
    if (s.phase === 'instrumentSelect') {
      const pick = rng.chance(EPS) ? (canRefresh(s) && rng.chance(0.3) ? 'refresh' : rng.int(s.hand.length)) : picker(s, mix(seed, 5000 + g))
      s = pick === 'refresh' ? play(s, { type: 'refresh' }) : play(s, { type: 'selectCard', index: pick }, { type: 'confirm' })
      continue
    }
    if (rng.chance(EPS)) {
      const os = options(s)
      s = canRefresh(s) && s.openBox === null && rng.chance(0.2) ? play(s, { type: 'refresh' }) : play(s, ...os[rng.int(os.length)])
      continue
    }
    const { best, value, stay } = chooser(s, mix(seed, g))
    if (s.openBox === null && value <= (stay ?? ultimateActivity(s)) && canRefresh(s)) { s = play(s, { type: 'refresh' }); continue }
    s = play(s, ...best)
  }
  const y = goalScore(ultimateActivity(s)) / 1e6
  if (ROWS) { for (const [, x] of rows) rowsOut.push(...x, y); continue }
  for (const [round, x] of rows) {
    const r = round - 1, base = r * F * F
    // most features are 0 (instruments not owned): only the others are summed
    const nz = x.flatMap((v, i) => (v === 0 ? [] : [i]))
    for (let a = 0; a < nz.length; a++) {
      const i = nz[a], xi = x[i]
      xty[r * F + i] += xi * y
      for (let b = a; b < nz.length; b++) xtx[base + i * F + nz[b]] += xi * x[nz[b]]
    }
    yy[r] += y * y
    n[r]++
  }
}
if (ROWS) {
  writeFileSync(out, Buffer.from(new Float32Array(rowsOut).buffer))
  console.log(JSON.stringify({ games: N, boards: rowsOut.length / (TREE_FEATURES.length + 1), secs: (Date.now() - t0) / 1000 }))
  process.exit(0)
}
const all = new Float64Array(xtx.length + xty.length + 2 * R)
all.set(xtx, 0); all.set(xty, xtx.length); all.set(yy, xtx.length + xty.length); all.set(n, xtx.length + xty.length + R)
writeFileSync(out, Buffer.from(all.buffer))
console.log(JSON.stringify({ games: N, boards: n.reduce((a, b) => a + b, 0), secs: (Date.now() - t0) / 1000 }))
