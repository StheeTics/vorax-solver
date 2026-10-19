// Puts the panel icons players taught ("Which instrument did you pick?", collected in data/live/icons.jsonl)
// into the reader for everyone: src/solver/scan/learnedIcons.json, read beside the built-in icons.
//  - For an instrument the reader knows, an answer must match that instrument's icon (and better than any
//    other's): one wrong click can't teach everyone a wrong picture.
//  - For one it has no icon for, an answer goes in unless it looks like another instrument. Answers rarely
//    agree with each other (the same icon is cut a few pixels apart on different screens), and a wrong one does
//    little harm: the reader only trusts an icon matched at 0.8 or more, else it asks the player as before.
// Run by scripts/live/learnIcons.ts (the hourly live-data workflow).

export interface TaughtIcon { uid: string; name: string; pattern: number[] }

/** as close as two pictures of one icon come (the reader calls an icon sure at 0.8) */
const MATCH = 0.8
/** an answer this close to another instrument's icon is more likely a wrong click */
const LIKE_OTHER = 0.6
/** at most this many learned patterns per instrument */
const KEEP = 8
const NOT_INSTRUMENTS = new Set(['none', '(starting item)'])

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0)
const best = (p: number[], vs: number[][] = []) => Math.max(-1, ...vs.map(v => dot(v, p)))

/** The taught icons confirmed for each instrument, given the reader's built-in icons. */
export function acceptIcons(taught: TaughtIcon[], builtIn: Record<string, number[][]>): Record<string, number[][]> {
  const seen = new Set<string>()
  const byName = new Map<string, TaughtIcon[]>()
  for (const t of taught) {
    if (NOT_INSTRUMENTS.has(t.name) || seen.has(t.uid)) continue
    seen.add(t.uid)
    byName.set(t.name, [...(byName.get(t.name) ?? []), t])
  }
  const out: Record<string, number[][]> = {}
  for (const [name, list] of byName) {
    const accepted: { p: number[] }[] = []
    for (const t of list) {
      const other = Math.max(-1, ...Object.entries(builtIn).filter(([n]) => n !== name && !NOT_INSTRUMENTS.has(n)).map(([, vs]) => best(t.pattern, vs)))
      const known = builtIn[name]?.length
      const ok = known ? best(t.pattern, builtIn[name]) >= MATCH && best(t.pattern, builtIn[name]) > other : other < LIKE_OTHER
      if (ok) accepted.push({ p: t.pattern })
    }
    if (accepted.length) out[name] = accepted.slice(0, KEEP).map(a => a.p)
  }
  return out
}
