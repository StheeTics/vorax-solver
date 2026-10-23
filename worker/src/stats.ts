// The dashboard's numbers, worked out from the stored boards. Only counts leave: the daily player code
// (a salted hash of the address that changes every day) is used to count players per day and never sent.

import { finalScore } from '../../src/engine/final'

export interface StatRow { received: string; client: string; body: string }

interface Tank { archetype: string; rarity: string; activity: number; quantity: number }
interface Board { run: string; install?: string; seq?: number; round: number; phase?: string; app: string; corrected?: string[]; unsure?: string[]; unreadable?: boolean; debug?: Debug; instruments?: string[]; tanks?: (Tank | null)[]; advice?: { reached: number | null } }

interface Debug { frame: [number, number]; hdr: boolean; browser: string; window?: { outer: [number, number]; client: [number, number] } }

/** The screen's shape by name, when it's within 3% of a common one. */
const SHAPES: [string, number][] = [['4:3', 4 / 3], ['16:10', 1.6], ['16:9', 16 / 9], ['21:9', 2.37], ['32:9', 32 / 9]]
export function shape([w, h]: [number, number]): string {
  const r = w / h
  return SHAPES.find(([, v]) => Math.abs(r - v) / v < 0.03)?.[0] ?? `${r.toFixed(2)}:1`
}

/** The groups a board's setup falls in, one per question. */
function setupOf(d: Debug): [string, string][] {
  const win = !d.window ? 'website' : d.window.outer[0] === d.window.client[0] && d.window.outer[1] === d.window.client[1] ? 'borderless or fullscreen' : 'windowed'
  const browser = d.browser.split(' ')[0]
  return [['screen', shape(d.frame)], ['window', win], ['HDR', d.hdr ? 'on' : 'off'], ['browser', browser === 'Electron' ? 'Electron (app)' : browser]]
}

/** The advice's goal (src/strategy/bot.ts TARGET): with the endgame battle bonus it reaches rainbow. */
const TARGET = 840_000
/** A final above this is a misread number (real games end below about 3.5M) and isn't counted. */
const MAX_FINAL = 10_000_000
const total = (b: Board) => (b.tanks ?? []).reduce((s, t) => s + (t ? t.activity * t.quantity : 0), 0)

export interface Stats {
  generated: string
  /** playersEver: different installs (a random number per browser or app) since countedSince, the first day one came;
   *  playerDays: every day's players (different devices that day) added up, which counts a player once per day played */
  totals: { boards: number; games: number; playersToday: number; playersEver: number; countedSince: string | null; playerDays: number }
  /** per day: boards, games, players (different devices that day), games played on the website / in the app,
   *  and the games finished that day with their average final score (null when none finished) */
  days: { day: string; boards: number; games: number; players: number; website: number; app: number; finished: number; averageFinal: number | null; medianFinal: number | null }[]
  /** games by the highest round they reached */
  rounds: Record<number, number>
  /** the share of boards a player corrected */
  corrected: number
  /** the share of boards shared with something the reader wasn't sure of (and the player didn't correct) */
  unsure: number
  /** games per site version */
  versions: Record<string, number>
  /** score: the final score when the game finished, else the total on its last shared board */
  recent: { start: string; boards: number; round: number; app: boolean; instruments: string[]; score: number; finished: boolean }[]
  /** games that reached the round-13 Surgical Protocol: the final score is its board after round 13's last
   *  instrument effects (src/engine/final.ts); average counts every point, capped stops counting at 840,000 */
  finished: { games: number; reached: number; finals: number[]; average: number; median: number; capped: number }
  /** for each setup (screen shape, windowed or not, HDR, browser): boards, and the shares read with something
   *  unsure and with a tank's numbers unsure */
  problems: { by: string; group: string; boards: number; unsure: number; numbers: number }[]
  /** the advice's predicted chance of 840,000 (in 20% bands) against how those finished games ended */
  calibration: { band: string; predicted: number; games: number; reached: number }[]
  /** the free plans' use, added by the workflow (scripts/live/usage.ts); absent before its tokens are set */
  usage?: Usage
}

/** The free plans' use and limits. A part is left out when its token isn't set or its API didn't answer. */
export interface Usage {
  checked: string
  /** what the dashboard measures against: per UTC day, but bytes for the database and minutes per month */
  limits: { rowsRead: number; rowsWritten: number; requests: number; bytes: number; minutes: number }
  /** per UTC day, oldest first: the D1 database's rows read and written, its size, and the Worker's requests */
  cloudflare?: { day: string; rowsRead: number; rowsWritten: number; requests: number; bytes: number }[]
  /** GitHub Actions this month: minutes as counted against the free minutes (Windows counts twice), the minutes
   *  per runner, and what GitHub charges beyond the free minutes, in dollars */
  github?: { month: string; minutes: number; runners: Record<string, number>; charged: number }
}

const RECENT = 25

export function summarize(rows: StatRow[], now = new Date()): Stats {
  type Game = { start: string; day: string; boards: number; round: number; read: number; app: boolean; version: string; instruments: string[]; picked: Map<string, number>; final: number | null; predictions: number[]; last: number; score: number }
  const games = new Map<string, Game>()
  // a run (one Solver session) can hold several games: a new one starts when a round read for sure goes back
  const current = new Map<string, { key: string; n: number; round: number }>()
  const days = new Map<string, { boards: number; players: Set<string> }>()
  let corrected = 0
  let unsure = 0
  const installs = new Set<string>()
  let countedSince: string | null = null
  const setups = new Map<string, { by: string; group: string; boards: number; unsure: number; numbers: number }>()
  for (const r of rows) {
    let b: Board
    try {
      b = JSON.parse(r.body)
    } catch {
      continue
    }
    const day = r.received.slice(0, 10)
    const d = days.get(day) ?? { boards: 0, players: new Set<string>() }
    d.boards++
    d.players.add(r.client)
    days.set(day, d)
    if (b.install) {
      installs.add(b.install)
      if (!countedSince || day < countedSince) countedSince = day
    }
    if (b.corrected?.length) corrected++
    if (b.unsure?.length) unsure++
    if (b.debug?.frame) for (const [by, group] of setupOf(b.debug)) {
      const k = `${by}|${group}`
      const g = setups.get(k) ?? { by, group, boards: 0, unsure: 0, numbers: 0 }
      g.boards++
      // a picture that wasn't the game screen: nothing on it read
      if (b.unsure?.length || b.unreadable) g.unsure++
      if (b.unreadable || b.unsure?.some(f => /\.(activity|quantity)$/.test(f))) g.numbers++
      setups.set(k, g)
    }
    const app = /-overlay$/.test(b.app)
    const sure = !b.unsure?.includes('round')
    let at = current.get(b.run) ?? { key: b.run, n: 0, round: 0 }
    if (sure && b.round < at.round) at = { key: `${b.run}#${at.n + 1}`, n: at.n + 1, round: 0 }
    if (sure) at.round = Math.max(at.round, b.round)
    current.set(b.run, at)
    const g: Game = games.get(at.key) ?? { start: r.received, day, boards: 0, round: 0, read: 0, app, version: b.app.replace(/-overlay$/, ''), instruments: [], picked: new Map(), final: null, predictions: [], last: -1, score: 0 }
    g.boards++
    const seq = b.seq ?? g.boards
    if (seq >= g.last) {
      g.last = seq
      g.score = total(b)
    }
    g.round = Math.max(g.round, b.round)
    // an unread round falls back to 1: only a round read for sure says how far the game got
    if (!b.unsure?.includes('round')) g.read = Math.max(g.read, b.round)
    if (b.instruments?.length) g.instruments = b.instruments
    // the round each instrument was first seen, for the ones that fire every few rounds
    for (const n of b.instruments ?? []) if (!g.picked.has(n)) g.picked.set(n, sure ? b.round : 1)
    // a final score with an unsure number isn't one
    if (b.round === 13 && b.phase === 'protocol' && b.tanks && !b.unsure?.some(f => /\.(activity|quantity)$/.test(f))) {
      const ins = b.instruments ?? []
      const end = finalScore(b.tanks as Parameters<typeof finalScore>[0], ins, ins.map(n => g.picked.get(n) ?? 1))
      g.final = end <= MAX_FINAL ? end : null
    }
    if (typeof b.advice?.reached === 'number') g.predictions.push(b.advice.reached)
    games.set(at.key, g)
  }
  // a game that never got past its first instrument offer wasn't played: the Solver used to start a new game ID on
  // every board there (a reroll, a recheck), so most "games" seemed to stop at round 1. Those boards still count.
  const list = [...games.values()].filter(g => g.round > 1 || g.instruments.length > 0)
  const today = now.toISOString().slice(0, 10)
  const rounds: Record<number, number> = {}
  const versions: Record<string, number> = {}
  for (const g of list) {
    // 0: the round was never read for sure (a screen the reader struggles with)
    rounds[g.read] = (rounds[g.read] ?? 0) + 1
    versions[g.version] = (versions[g.version] ?? 0) + 1
  }
  const finished = list.filter(g => g.final !== null)
  const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0 }
  const finals = finished.map(g => g.final!)
  const bands = new Map<number, { sum: number; games: number; reached: number }>()
  for (const g of finished) for (const p of g.predictions) {
    const k = Math.min(4, Math.floor(p * 5))
    const band = bands.get(k) ?? { sum: 0, games: 0, reached: 0 }
    band.sum += p
    band.games++
    if (g.final! >= TARGET) band.reached++
    bands.set(k, band)
  }
  return {
    generated: now.toISOString(),
    finished: {
      games: finals.length, reached: finals.filter(f => f >= TARGET).length, finals,
      average: finals.length ? Math.round(finals.reduce((s, f) => s + f, 0) / finals.length) : 0, median: median(finals),
      capped: finals.length ? Math.round(finals.reduce((s, f) => s + Math.min(f, TARGET), 0) / finals.length) : 0,
    },
    calibration: [...bands.entries()].sort(([a], [b]) => a - b).map(([k, b]) => ({ band: `${k * 20}–${k * 20 + 20}%`, predicted: Math.round((100 * b.sum) / b.games) / 100, games: b.games, reached: b.reached })),
    totals: {
      boards: rows.length, games: list.length, playersToday: days.get(today)?.players.size ?? 0,
      playersEver: installs.size, countedSince, playerDays: [...days.values()].reduce((n, d) => n + d.players.size, 0),
    },
    days: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => {
      const played = list.filter(g => g.day === day)
      const done = played.filter(g => g.final !== null)
      return {
        day, boards: d.boards, games: played.length, players: d.players.size, website: played.filter(g => !g.app).length, app: played.filter(g => g.app).length,
        finished: done.length, averageFinal: done.length ? Math.round(done.reduce((s, g) => s + g.final!, 0) / done.length) : null,
        medianFinal: done.length ? median(done.map(g => g.final!)) : null,
      }
    }),
    rounds,
    corrected: rows.length ? corrected / rows.length : 0,
    unsure: rows.length ? unsure / rows.length : 0,
    problems: [...setups.values()].map(g => ({ ...g, unsure: g.unsure / g.boards, numbers: g.numbers / g.boards })).sort((a, b) => a.by.localeCompare(b.by) || b.boards - a.boards),
    versions,
    recent: list.sort((a, b) => b.start.localeCompare(a.start)).slice(0, RECENT).map(g => ({ start: g.start, boards: g.boards, round: g.round, app: g.app, instruments: g.instruments, score: g.final ?? g.score, finished: g.final !== null })),
  }
}
