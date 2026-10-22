// The dashboard's numbers, worked out from the stored boards. Only counts leave: the daily player code
// (a salted hash of the address that changes every day) is used to count players per day and never sent.

export interface StatRow { received: string; client: string; body: string }

interface Tank { activity: number; quantity: number }
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
const TARGET = 900_000
const total = (b: Board) => (b.tanks ?? []).reduce((s, t) => s + (t ? t.activity * t.quantity : 0), 0)

export interface Stats {
  generated: string
  /** playersEver: different installs (a random number per browser or app) since countedSince, the first day one came;
   *  playerDays: every day's players (different devices that day) added up, which counts a player once per day played */
  totals: { boards: number; games: number; playersToday: number; playersEver: number; countedSince: string | null; playerDays: number }
  /** per day: boards, games, players (different devices that day), games played on the website / in the app,
   *  and the games finished that day with their average final score (null when none finished) */
  days: { day: string; boards: number; games: number; players: number; website: number; app: number; finished: number; averageFinal: number | null }[]
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
  /** games that reached the round-13 Surgical Protocol: its board's total is the final score */
  finished: { games: number; reached: number; finals: number[]; average: number }
  /** for each setup (screen shape, windowed or not, HDR, browser): boards, and the shares read with something
   *  unsure and with a tank's numbers unsure */
  problems: { by: string; group: string; boards: number; unsure: number; numbers: number }[]
  /** the advice's predicted chance of 900,000 (in 20% bands) against how those finished games ended */
  calibration: { band: string; predicted: number; games: number; reached: number }[]
}

const RECENT = 25

export function summarize(rows: StatRow[], now = new Date()): Stats {
  const games = new Map<string, { start: string; day: string; boards: number; round: number; read: number; app: boolean; version: string; instruments: string[]; final: number | null; predictions: number[]; last: number; score: number }>()
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
    const g = games.get(b.run) ?? { start: r.received, day, boards: 0, round: 0, read: 0, app, version: b.app.replace(/-overlay$/, ''), instruments: [], final: null, predictions: [], last: -1, score: 0 }
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
    // a final score with an unsure number isn't one
    if (b.round === 13 && b.phase === 'protocol' && !b.unsure?.some(f => /\.(activity|quantity)$/.test(f))) g.final = total(b)
    if (typeof b.advice?.reached === 'number') g.predictions.push(b.advice.reached)
    games.set(b.run, g)
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
    finished: { games: finished.length, reached: finished.filter(g => g.final! >= TARGET).length, finals: finished.map(g => g.final!), average: finished.length ? Math.round(finished.reduce((s, g) => s + g.final!, 0) / finished.length) : 0 },
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
