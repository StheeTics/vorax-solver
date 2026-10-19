// The dashboard's numbers, worked out from the stored boards. Only counts leave: the daily player code
// (a salted hash of the address that changes every day) is used to count players per day and never sent.

export interface StatRow { received: string; client: string; body: string }

interface Board { run: string; round: number; app: string; corrected?: string[]; instruments?: string[] }

export interface Stats {
  generated: string
  totals: { boards: number; games: number; playersToday: number }
  /** per day: boards, games, players (different devices that day), games played on the website / in the app */
  days: { day: string; boards: number; games: number; players: number; website: number; app: number }[]
  /** games by the highest round they reached */
  rounds: Record<number, number>
  /** the share of boards a player corrected */
  corrected: number
  /** games per site version */
  versions: Record<string, number>
  recent: { start: string; boards: number; round: number; app: boolean; instruments: string[] }[]
}

const RECENT = 25

export function summarize(rows: StatRow[], now = new Date()): Stats {
  const games = new Map<string, { start: string; day: string; boards: number; round: number; app: boolean; version: string; instruments: string[] }>()
  const days = new Map<string, { boards: number; games: Set<string>; players: Set<string> }>()
  let corrected = 0
  for (const r of rows) {
    let b: Board
    try {
      b = JSON.parse(r.body)
    } catch {
      continue
    }
    const day = r.received.slice(0, 10)
    const d = days.get(day) ?? { boards: 0, games: new Set<string>(), players: new Set<string>() }
    d.boards++
    d.games.add(b.run)
    d.players.add(r.client)
    days.set(day, d)
    if (b.corrected?.length) corrected++
    const app = /-overlay$/.test(b.app)
    const g = games.get(b.run) ?? { start: r.received, day, boards: 0, round: 0, app, version: b.app.replace(/-overlay$/, ''), instruments: [] }
    g.boards++
    g.round = Math.max(g.round, b.round)
    if (b.instruments?.length) g.instruments = b.instruments
    games.set(b.run, g)
  }
  const list = [...games.values()]
  const today = now.toISOString().slice(0, 10)
  const rounds: Record<number, number> = {}
  const versions: Record<string, number> = {}
  for (const g of list) {
    rounds[g.round] = (rounds[g.round] ?? 0) + 1
    versions[g.version] = (versions[g.version] ?? 0) + 1
  }
  return {
    generated: now.toISOString(),
    totals: { boards: rows.length, games: list.length, playersToday: days.get(today)?.players.size ?? 0 },
    days: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => {
      const played = list.filter(g => g.day === day)
      return { day, boards: d.boards, games: d.games.size, players: d.players.size, website: played.filter(g => !g.app).length, app: played.filter(g => g.app).length }
    }),
    rounds,
    corrected: rows.length ? corrected / rows.length : 0,
    versions,
    recent: list.sort((a, b) => b.start.localeCompare(a.start)).slice(0, RECENT).map(g => ({ start: g.start, boards: g.boards, round: g.round, app: g.app, instruments: g.instruments })),
  }
}
