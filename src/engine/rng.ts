export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number
  int(n: number): number
  chance(p: number): boolean
  pick<T>(arr: readonly T[]): T | undefined
  /** Unbiased Fisher–Yates; returns a copy. */
  shuffle<T>(arr: readonly T[]): T[]
  sample<T>(arr: readonly T[], n: number): T[]
  /** Serializable state; createRng(state()) resumes the sequence. */
  state(): number
}

function withHelpers(next: () => number, state: () => number): Rng {
  const int = (n: number) => Math.floor(next() * n)
  // Forward Fisher–Yates: j ∈ [i, len). A stream of zeros yields the identity order,
  // which keeps stubbed tests readable ("first candidate wins").
  const shuffle = <T>(arr: readonly T[]): T[] => {
    const a = [...arr]
    for (let i = 0; i < a.length - 1; i++) {
      const j = i + int(a.length - i)
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  return {
    next,
    int,
    chance: p => next() < p,
    pick: arr => (arr.length === 0 ? undefined : arr[int(arr.length)]),
    shuffle,
    sample: (arr, n) => shuffle(arr).slice(0, Math.min(n, arr.length)),
    state,
  }
}

/** mulberry32 */
export function createRng(seed: number): Rng {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return withHelpers(next, () => s)
}

/** Test helper: next() cycles through the given values. */
export function stubRng(values: number[]): Rng {
  let i = 0
  const next = () => values[i++ % values.length]
  return withHelpers(next, () => i)
}
