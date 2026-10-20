// Checks the simulator's card effects against real games: for each potion board a player shared and the
// game's next board, every option on the first is played SEEDS times in the engine (with the round's end),
// and the closest outcome to the real next board is kept. A pair no option reproduces points at a card
// whose effect the simulator gets wrong, or at a misread board.
// Usage: vite-node scripts/live/checkRules.ts <data/live/raw folder, a boards .jsonl, or an export .json>
//   → data/live/rules-check.json (the analytics dashboard's "Card effects in real games")
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { toState, type ScreenState } from '@/strategy/advisor'
import { options, play } from '@/strategy/bot'
import type { GameState, Monster } from '@/engine/types'

const SEEDS = 200

interface Board extends ScreenState { run: string; seq: number; round: number; refreshes?: number; unsure?: string[]; unreadable?: boolean }

/** 0 when two tanks match exactly; 1 a different monster; 0.5 the same monster with other numbers. */
function tankGap(a: Monster | null, b: Monster | null): number {
  if (!a || !b) return a === b ? 0 : 1
  if (a.archetype !== b.archetype || a.rarity !== b.rarity) return 1
  return a.activity === b.activity && a.quantity === b.quantity ? 0 : 0.5
}
const gap = (a: (Monster | null)[], b: (Monster | null)[]) => a.reduce((s, t, i) => s + tankGap(t, b[i] ?? null), 0)

/** Plays an option, then the round's end, up to the next offer. */
function after(s: GameState, o: Parameters<typeof play>[1][], seed: number): GameState {
  let n = play({ ...s, rngState: seed >>> 0 }, ...o)
  for (let i = 0; i < 5 && n.phase === 'roundEnd'; i++) n = play(n, { type: 'confirm' })
  return n
}

export interface Check { run: string; seq: number; round: number; hand: string[]; instruments: string[]; best: string; gap: number; reproduced: boolean }

export function checkPair(a: Board, b: Board): Check | null {
  const s = toState({ ...a, potionRefreshes: a.refreshes ?? 0 }, [])
  if (s.phase !== 'potionSelect') return null
  let best = { gap: Infinity, label: '' }
  for (const o of options(s)) {
    for (let k = 0; k < SEEDS && best.gap > 0; k++) {
      const n = after(s, o, k * 7919 + 13)
      const g = gap(n.tanks, b.tanks)
      if (g < best.gap) {
        const i = (o[0] as { index: number }).index
        best = { gap: g, label: `${a.hand[i]}${o.filter(x => x.type === 'toggleTarget').map(x => ` → tank ${(x as { tank: number }).tank + 1}`).join('')}` }
      }
    }
  }
  return { run: a.run, seq: a.seq, round: a.round, hand: a.hand, instruments: a.instruments, best: best.label, gap: best.gap, reproduced: best.gap === 0 }
}

/** Consecutive boards of one game where a potion was played: the next round's offer, or the same round's instrument offer. */
export function pairs(boards: Board[]): [Board, Board][] {
  const byRun = new Map<string, Board[]>()
  for (const b of boards) byRun.set(b.run, [...(byRun.get(b.run) ?? []), b])
  const out: [Board, Board][] = []
  for (const list of byRun.values()) {
    list.sort((x, y) => x.seq - y.seq)
    for (let i = 0; i + 1 < list.length; i++) {
      const [a, b] = [list[i], list[i + 1]]
      if (a.phase !== 'potion' || a.hand.length !== 3) continue
      // a misread would look like a card effect the simulator gets wrong: only boards whose tanks and cards were
      // read for sure (an unsure phase, round or refresh count doesn't change the replay)
      const misread = (x: Board) => x.unreadable || (x.unsure ?? []).some(f => /^(tank|hand|instrument)/.test(f))
      if (misread(a) || misread(b)) continue
      if ((b.phase === 'potion' && b.round === a.round + 1) || (b.phase === 'instrument' && b.round === a.round)) out.push([a, b])
    }
  }
  return out
}

if (process.argv[2]) {
  const from = process.argv[2]
  const files = statSync(from).isDirectory() ? readdirSync(from).filter(n => n.endsWith('.jsonl')).map(n => `${from}/${n}`) : [from]
  const boards: Board[] = files.flatMap(f => {
    const text = readFileSync(f, 'utf8')
    // an export (one JSON object with rows), or one board per line
    if (f.endsWith('.json')) return JSON.parse(text).rows.map((r: { body: string }) => JSON.parse(r.body))
    return text.split('\n').filter(Boolean).map(l => JSON.parse(l))
  })
  const checks = pairs(boards).map(([a, b]) => checkPair(a, b)).filter((c): c is Check => !!c)
  const missed = checks.filter(c => !c.reproduced)
  writeFileSync('data/live/rules-check.json', JSON.stringify({ checked: checks.length, reproduced: checks.length - missed.length, missed }, null, 2) + '\n')
  console.log(`${checks.length} moves checked: ${checks.length - missed.length} reproduced, ${missed.length} not`)
  for (const m of missed) console.log(`  round ${m.round}: ${m.hand.join(', ')} | ${m.instruments.join(', ') || 'no instruments'} | closest: ${m.best} (${m.gap} tanks off)`)
}
