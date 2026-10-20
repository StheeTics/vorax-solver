// Fits the board value as gradient-boosted decision trees (src/strategy/value.ts) from valueData.ts's ROWS output: each
// tree a few yes/no questions about the board, each fitted to what the trees before it still get wrong. Features are
// cut into up to 32 buckets to find the questions; it stops at the tree count that predicts the check games best.
// Usage: vite-node scripts/sim/treeFit.ts <model.json> <training rows .bin...> check: <check rows .bin...>
import { readFileSync, writeFileSync } from 'node:fs'
import { TREE_FEATURES, type Tree } from '@/strategy/value'

const F = TREE_FEATURES.length, W = F + 1, B = 32
const DEPTH = Number(process.env.DEPTH ?? 6), LR = Number(process.env.LR ?? 0.1), MAX_TREES = Number(process.env.TREES ?? 400), MIN_LEAF = 100
const [, , outPath, ...rest] = process.argv
const cut = rest.indexOf('check:')
const load = (files: string[]) => {
  const parts = files.map(f => { const b = readFileSync(f); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4) })
  const all = new Float32Array(parts.reduce((t, p) => t + p.length, 0))
  let o = 0
  for (const p of parts) { all.set(p, o); o += p.length }
  return { rows: all, n: all.length / W }
}
const train = load(rest.slice(0, cut)), check = load(rest.slice(cut + 1))
const t0 = Date.now()
const n = train.n, X = train.rows
const y = (set: typeof train, i: number) => set.rows[i * W + F]

// bucket edges per feature from a sample: x < edges[f][j] ⇔ bucket ≤ j
const edges: number[][] = []
for (let f = 0; f < F; f++) {
  const sample: number[] = []
  for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 50_000))) sample.push(X[i * W + f])
  const vals = [...new Set(sample)].sort((a, b) => a - b)
  const e: number[] = []
  if (vals.length <= B) for (let k = 1; k < vals.length; k++) e.push((vals[k - 1] + vals[k]) / 2)
  else {
    sample.sort((a, b) => a - b)
    for (let k = 1; k < B; k++) { const v = sample[Math.floor((k * sample.length) / B)]; if (!e.length || v > e[e.length - 1]) e.push(v) }
  }
  edges.push(e)
}
const bucket = (f: number, v: number) => { const e = edges[f]; let lo = 0, hi = e.length; while (lo < hi) { const m = (lo + hi) >> 1; if (v < e[m]) hi = m; else lo = m + 1 } return lo }
const bins = new Uint8Array(n * F)
for (let i = 0; i < n; i++) for (let f = 0; f < F; f++) bins[i * F + f] = bucket(f, X[i * W + f])

let base = 0
for (let i = 0; i < n; i++) base += y(train, i)
base /= n
const resid = new Float64Array(n)
for (let i = 0; i < n; i++) resid[i] = y(train, i) - base
const checkPred = new Float64Array(check.n).fill(base)
const checkErr = () => { let e = 0; for (let i = 0; i < check.n; i++) e += (y(check, i) - checkPred[i]) ** 2; return e / check.n }
const sizes = 2 ** (DEPTH + 1) - 1
const trees: Tree[] = []
let bestErr = checkErr(), bestCount = 0
console.log(`${n} boards to learn from, ${check.n} to check; before any tree, typical miss ${Math.round(Math.sqrt(bestErr) * 1e6).toLocaleString()}`)
const node = new Int32Array(n)
for (let t = 0; t < MAX_TREES; t++) {
  const tree: Tree = { f: new Array(sizes).fill(-1), t: new Array(sizes).fill(0), l: new Array(sizes).fill(-1), r: new Array(sizes).fill(-1), v: new Array(sizes).fill(0) }
  node.fill(0)
  for (let level = 0; level <= DEPTH; level++) {
    const first = 2 ** level - 1, count = 2 ** level
    const G = new Float64Array(count * F * B), C = new Float64Array(count * F * B)
    for (let i = 0; i < n; i++) {
      const k = node[i]
      if (k < first) continue
      const o = (k - first) * F * B, g = resid[i]
      for (let f = 0; f < F; f++) { const idx = o + f * B + bins[i * F + f]; G[idx] += g; C[idx]++ }
    }
    const split = new Int32Array(count).fill(-1)
    for (let a = 0; a < count; a++) {
      const k = first + a, o = a * F * B
      let S = 0, N = 0
      for (let b = 0; b < B; b++) { S += G[o + b]; N += C[o + b] }
      if (N === 0) continue
      tree.v[k] = (LR * S) / N
      if (level === DEPTH || N < 2 * MIN_LEAF) continue
      let best = 0, bf = -1, bb = -1
      for (let f = 0; f < F; f++) {
        let SL = 0, NL = 0
        for (let b = 0; b < edges[f].length; b++) {
          SL += G[o + f * B + b]; NL += C[o + f * B + b]
          const NR = N - NL
          if (NL < MIN_LEAF || NR < MIN_LEAF) continue
          const gain = (SL * SL) / NL + ((S - SL) * (S - SL)) / NR - (S * S) / N
          if (gain > best) { best = gain; bf = f; bb = b }
        }
      }
      if (bf < 0) continue
      tree.f[k] = bf; tree.t[k] = edges[bf][bb]; tree.l[k] = 2 * k + 1; tree.r[k] = 2 * k + 2; split[a] = bb
    }
    if (level === DEPTH) break
    for (let i = 0; i < n; i++) {
      const k = node[i]
      if (k < first) continue
      const bb = split[k - first]
      if (bb >= 0) node[i] = bins[i * F + tree.f[k]] <= bb ? 2 * k + 1 : 2 * k + 2
    }
  }
  // a row ends at the deepest node it reached; branches keep their value only as a fallback for empty children
  for (let i = 0; i < n; i++) resid[i] -= tree.v[node[i]]
  for (let i = 0; i < check.n; i++) {
    let k = 0
    while (tree.f[k] >= 0) k = check.rows[i * W + tree.f[k]] < tree.t[k] ? tree.l[k] : tree.r[k]
    checkPred[i] += tree.v[k]
  }
  for (let k = 0; k < sizes; k++) if (tree.f[k] >= 0) tree.v[k] = 0
  trees.push(tree)
  const err = checkErr()
  if (err < bestErr) { bestErr = err; bestCount = trees.length }
  if ((t + 1) % 25 === 0) console.log(`${t + 1} trees: typical miss on the check games ${Math.round(Math.sqrt(err) * 1e6).toLocaleString()} (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
  if (trees.length - bestCount >= 40) break
}
const kept = trees.slice(0, bestCount).map(t => ({ f: t.f, t: t.t.map(v => +v.toPrecision(7)), l: t.l, r: t.r, v: t.v.map(v => +v.toPrecision(6)) }))
writeFileSync(outPath, JSON.stringify({ base: +base.toPrecision(7), trees: kept }))
// by round, to compare with the straight-line fit
const byRound = new Map<number, { e: number; s: number; s2: number; n: number }>()
for (let i = 0; i < check.n; i++) {
  const r = check.rows[i * W], yy = y(check, i), m = byRound.get(r) ?? { e: 0, s: 0, s2: 0, n: 0 }
  m.e += (yy - checkPred[i]) ** 2; m.s += yy; m.s2 += yy * yy; m.n++; byRound.set(r, m)
}
console.log(`kept ${bestCount} trees; typical miss ${Math.round(Math.sqrt(bestErr) * 1e6).toLocaleString()}`)
for (const [r, m] of [...byRound].sort((a, b) => a[0] - b[0])) {
  const sst = m.s2 - (m.s * m.s) / m.n
  console.log(`round ${String(r).padStart(2)}: typical miss ${Math.round(Math.sqrt(m.e / m.n) * 1e6).toLocaleString()} | explains ${(100 * (1 - m.e / sst)).toFixed(1)}%`)
}
