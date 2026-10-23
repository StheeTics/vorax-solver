// The dashboard's numbers as served. Working them out from every board is too much for one request on the
// free plan (10 ms of CPU), so the nightly jobs do it (scripts/live/summary.ts runs summarize() over
// data/live/raw) and stores the result here. The players per day, which need the daily player code, are added on
// each request from the players table: that code never leaves the collector.
import type { Stats } from './stats'

/** per day: the different devices that sent boards */
export interface DayCount { day: string; players: number }

/** Before the workflow has sent a summary: nothing worked out yet. */
export const emptyStats = (now = new Date()): Stats => ({
  generated: now.toISOString(),
  totals: { boards: 0, games: 0, playersToday: 0, playersEver: 0, countedSince: null, playerDays: 0 },
  days: [],
  rounds: {},
  corrected: 0,
  unsure: 0,
  versions: {},
  recent: [],
  finished: { games: 0, reached: 0, finals: [], average: 0, median: 0, capped: 0 },
  problems: [],
  calibration: [],
})

/** The workflow's summary with the collector's own counts put in: players per day, today, in all. */
export function withCounts(summary: Stats | null, counts: DayCount[], now = new Date()): Stats {
  const s = summary ?? emptyStats(now)
  const today = now.toISOString().slice(0, 10)
  const worked = new Map(s.days.map(d => [d.day, d]))
  // a day the workflow hasn't seen yet (players since its last pull) has its players, no boards or games yet
  const none = { boards: 0, games: 0, website: 0, app: 0, finished: 0, averageFinal: null, medianFinal: null }
  const days = counts.map(c => ({ ...none, ...worked.get(c.day), day: c.day, players: c.players }))
  return {
    ...s,
    totals: {
      ...s.totals,
      playersToday: counts.find(c => c.day === today)?.players ?? 0,
      playerDays: counts.reduce((n, c) => n + c.players, 0),
    },
    days: days.sort((a, b) => a.day.localeCompare(b.day)),
  }
}

/** A summary sent by the workflow, checked enough that the page can draw it. */
export function isStats(v: unknown): v is Stats {
  const s = v as Stats
  return !!s && typeof s === 'object' && typeof s.generated === 'string' && !!s.totals && typeof s.totals === 'object' && Array.isArray(s.days) && !!s.finished && Array.isArray(s.recent)
}
