// Fits the board value (src/strategy/value.ts) from valueData.ts's sums: per round, the ridge least-squares weights
// for the final score from the board's features; the ridge is picked by how well each fit predicts other games.
// Usage: vite-node scripts/sim/valueFit.ts <model.json> <training .bin files...> check: <check .bin files...>
import { readFileSync, writeFileSync } from 'node:fs'
import { FEATURE_NAMES } from '@/strategy/value'

const F = FEATURE_NAMES.length, R = 13
const [, , outPath, ...rest] = process.argv
const cut = rest.indexOf('check:')
if (cut < 1) throw new Error('usage: valueFit.ts <model.json> <training .bin...> check: <check .bin...>')
const load = (files: string[]) => {
  const sum = new Float64Array(R * F * F + R * F + 2 * R)
  for (const f of files) {
    const b = readFileSync(f)
    const a = new Float64Array(b.buffer, b.byteOffset, b.byteLength / 8)
    for (let i = 0; i < a.length; i++) sum[i] += a[i]
  }
  return {
    xtx: (r: number, i: number, j: number) => (i <= j ? sum[r * F * F + i * F + j] : sum[r * F * F + j * F + i]),
    xty: (r: number, i: number) => sum[R * F * F + r * F + i],
    yy: (r: number) => sum[R * F * F + R * F + r],
    n: (r: number) => sum[R * F * F + R * F + R + r],
  }
}
const train = load(rest.slice(0, cut)), check = load(rest.slice(cut + 1))

/** Solves (A + λI) w = b by Cholesky; A symmetric positive semi-definite. */
function solve(A: (i: number, j: number) => number, b: number[], lambda: number): number[] {
  const L = Array.from({ length: F }, () => new Float64Array(F))
  for (let i = 0; i < F; i++) for (let j = 0; j <= i; j++) {
    let s = A(i, j) + (i === j && i > 0 ? lambda : 0) + (i === j ? 1e-9 : 0)
    for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
    L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j]
  }
  const z = new Float64Array(F)
  for (let i = 0; i < F; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * z[k]; z[i] = s / L[i][i] }
  const w = new Array<number>(F).fill(0)
  for (let i = F - 1; i >= 0; i--) { let s = z[i]; for (let k = i + 1; k < F; k++) s -= L[k][i] * w[k]; w[i] = s / L[i][i] }
  return w
}

/** Squared error of weights w on a set's sums for round r: yᵀy − 2wᵀXᵀy + wᵀXᵀXw. */
function sse(set: ReturnType<typeof load>, r: number, w: number[]): number {
  let quad = 0, lin = 0
  for (let i = 0; i < F; i++) {
    lin += w[i] * set.xty(r, i)
    let row = 0
    for (let j = 0; j < F; j++) row += set.xtx(r, i, j) * w[j]
    quad += w[i] * row
  }
  return set.yy(r) - 2 * lin + quad
}
const sst = (set: ReturnType<typeof load>, r: number) => set.yy(r) - set.xty(r, 0) ** 2 / Math.max(1, set.n(r))

const rounds: number[][] = []
for (let r = 0; r < R; r++) {
  if (!train.n(r)) { rounds.push(new Array(F).fill(0)); continue }
  let best: { lambda: number; w: number[]; err: number } | null = null
  for (const lambda of [1e-3, 1e-2, 1e-1, 1, 10, 100].map(l => l * train.n(r) * 1e-4)) {
    const w = solve((i, j) => train.xtx(r, i, j), FEATURE_NAMES.map((_, i) => train.xty(r, i)), lambda)
    const err = sse(check, r, w)
    if (!best || err < best.err) best = { lambda, w, err }
  }
  rounds.push(best!.w.map(v => +v.toPrecision(6)))
  const n = check.n(r)
  console.log(`round ${String(r + 1).padStart(2)}: ${train.n(r)} boards to learn from, ${n} to check | typical miss ${Math.round(Math.sqrt(best!.err / n) * 1e6).toLocaleString()} | explains ${(100 * (1 - best!.err / sst(check, r))).toFixed(1)}% (spread of results ${Math.round(Math.sqrt(sst(check, r) / n) * 1e6).toLocaleString()}) | ridge ${best!.lambda.toPrecision(2)}`)
}
writeFileSync(outPath, JSON.stringify({ rounds }))
