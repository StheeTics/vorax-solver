// Pulling shared boards from the collector into data/live/raw/<date>.jsonl (scripts/live/pull.ts runs it). Each
// line is a board with `received`, when the collector stored it (boards pulled before Oct 22 have only the file's date).
// Since Oct 23 the collector keeps an upload's boards together: its export row's body is an array of them.
// Since Oct 24 the raw boards stay on the PC that pulls them, for a week (scripts/nightly.sh), out of git: what the
// dashboard needs of them is kept in git as a digest (data/live/digest/<day>.json: the day's boards counted, and the
// games started that day; worker/src/stats.ts digest), added to on each pull.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Snapshot } from '../../src/solver/share/snapshot'
import { digest, emptyDigest, report, type Digest, type DayRecord, type GameRecord, type StatRow, type Usage } from '../../worker/src/stats'

const DIR = 'data/live'
const RAW = `${DIR}/raw`

interface Row { id: number; received: string; body: string }

// Where each export was read up to: { last } for boards, { icons } for named panel icons, { cards } for cards
// the Solver couldn't name.
const STATE = `${DIR}/state.json`
const readState = (): Record<string, number> => (existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {})

/** Pages through one of the collector's exports from where it was last read, handing on each row. */
async function drain(url: string, token: string, path: string, key: string, fetchFn: typeof fetch, keep: (r: Row) => void): Promise<number> {
  let last = readState()[key] ?? 0
  let added = 0
  for (;;) {
    const res = await fetchFn(`${url}${path}?after=${last}`, { headers: { authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`export failed: ${res.status}`)
    const { rows, last: next } = (await res.json()) as { rows: Row[]; last: number }
    rows.forEach(keep)
    added += rows.length
    if (!rows.length || next === last) break
    last = next
  }
  writeFileSync(STATE, JSON.stringify({ ...readState(), [key]: last }) + '\n')
  return added
}

const UID = /"uid":"([^"]+)"/

export async function pull(url: string, token: string, fetchFn: typeof fetch = fetch): Promise<number> {
  mkdirSync(RAW, { recursive: true })
  // an upload sent again (its answer lost) comes twice: each board is kept once, by its uid
  const seen = new Set(readdirSync(RAW).filter(f => f.endsWith('.jsonl'))
    .flatMap(f => readFileSync(`${RAW}/${f}`, 'utf8').split('\n').map(l => UID.exec(l)?.[1]).filter(u => u !== undefined)))
  let added = 0
  await drain(url, token, '/v1/export', 'last', fetchFn, r => {
    const got = JSON.parse(r.body) as Record<string, unknown> | Record<string, unknown>[]
    for (const b of Array.isArray(got) ? got : [got]) {
      if (typeof b.uid === 'string' && seen.has(b.uid)) continue
      if (typeof b.uid === 'string') seen.add(b.uid)
      // each board keeps when it came, for the dashboard's recent games (scripts/live/summary.ts)
      appendFileSync(`${RAW}/${r.received.slice(0, 10)}.jsonl`, JSON.stringify({ received: r.received, ...b }) + '\n')
      added++
    }
  })
  return added
}

/** Panel icons players named, into data/live/icons.jsonl: checked by hand before they join the reader's data. */
export async function pullIcons(url: string, token: string, fetchFn: typeof fetch = fetch): Promise<number> {
  mkdirSync(DIR, { recursive: true })
  return drain(url, token, '/v1/icons/export', 'icons', fetchFn, r => appendFileSync(`${DIR}/icons.jsonl`, r.body + '\n'))
}

/** Cards the Solver couldn't name, into data/live/cards.jsonl (without their pictures): the first picture of each
 *  card is kept as data/live/new-cards/<card>.jpg. scripts/live/newCards.ts lists them and opens an issue for each. */
export async function pullCards(url: string, token: string, fetchFn: typeof fetch = fetch): Promise<number> {
  mkdirSync(`${DIR}/new-cards`, { recursive: true })
  return drain(url, token, '/v1/cards/export', 'cards', fetchFn, r => {
    const c = JSON.parse(r.body) as { phase: string; text: string; picture?: string }
    const name = cardName(c.text)
    const file = `${DIR}/new-cards/${slug(c.phase, name)}.jpg`
    if (c.picture && !existsSync(file)) writeFileSync(file, Buffer.from(c.picture.slice(c.picture.indexOf(',') + 1), 'base64'))
    appendFileSync(`${DIR}/cards.jsonl`, JSON.stringify({ received: r.received, phase: c.phase, name, text: c.text }) + '\n')
  })
}

/** A card's name: its title's first line as read, without stray marks at either end. */
export const cardName = (text: string) => text.split('\n')[0].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, '').trim()
/** A file name for a card: its pick and name, lower case. */
export const slug = (phase: string, name: string) => `${phase}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'unnamed'}`

export function allRows(): Snapshot[] {
  if (!existsSync(RAW)) return []
  return readdirSync(RAW).filter(f => f.endsWith('.jsonl')).sort()
    .flatMap(f => readFileSync(`${RAW}/${f}`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Snapshot))
}

/** Every board for the dashboard's numbers, in the order they were stored, each with when it came (boards pulled
 *  before that was kept have their file's date). The daily player code never leaves the collector: it adds the
 *  counts by it itself. */
export function statRows(): StatRow[] {
  if (!existsSync(RAW)) return []
  return readdirSync(RAW).filter(f => f.endsWith('.jsonl')).sort().flatMap(f =>
    readFileSync(`${RAW}/${f}`, 'utf8').split('\n').filter(Boolean).map(body => {
      const received = /^\{"received":"([^"]+)"/.exec(body)?.[1] ?? `${f.slice(0, 10)}T00:00:00.000Z`
      return { received, client: '', body }
    }))
}

const DIGEST = `${DIR}/digest`
const DAY_FILE = /^\d{4}-\d\d-\d\d\.json$/

/** The digest in data/live/digest, or an empty one. */
export function loadDigest(): Digest {
  const d = emptyDigest()
  if (!existsSync(DIGEST)) return d
  for (const f of readdirSync(DIGEST).filter(f => DAY_FILE.test(f)).sort()) {
    const x = JSON.parse(readFileSync(`${DIGEST}/${f}`, 'utf8')) as { day: DayRecord | null; games: GameRecord[] }
    if (x.day) d.days.push(x.day)
    d.games.push(...x.games)
  }
  if (existsSync(`${DIGEST}/upto.txt`)) d.upto = readFileSync(`${DIGEST}/upto.txt`, 'utf8').trim()
  return d
}

/** Writes a digest out a file per day (a game in its start day's), a game per line. */
export function saveDigest(d: Digest) {
  mkdirSync(DIGEST, { recursive: true })
  const days = new Map<string, { day: DayRecord | null; games: GameRecord[] }>(d.days.map(x => [x.day, { day: x, games: [] }]))
  for (const g of d.games) (days.get(g.day) ?? days.set(g.day, { day: null, games: [] }).get(g.day)!).games.push(g)
  for (const [day, x] of days) {
    writeFileSync(`${DIGEST}/${day}.json`, `{"day":${JSON.stringify(x.day)},"games":[\n${x.games.map(g => JSON.stringify(g)).join(',\n')}\n]}\n`)
  }
  writeFileSync(`${DIGEST}/upto.txt`, d.upto + '\n')
}

/** The digest with the raw boards that came after it added. */
export const updatedDigest = (): Digest => {
  const d = loadDigest()
  return digest(statRows().filter(r => r.received > d.upto), d)
}

/** Works out the dashboard's numbers and sends them to the collector, which is too small to do it per request
 *  (worker/src/summary.ts). Returns a line for the log. */
export async function sendSummary(url: string, token: string, d: Digest, fetchFn: typeof fetch = fetch, usage: Usage | null = null): Promise<string> {
  const s = report(d)
  if (usage) s.usage = usage
  const res = await fetchFn(`${url}/v1/summary`, { method: 'PUT', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(s) })
  if (!res.ok) throw new Error(`summary refused: ${res.status} ${(await res.text()).slice(0, 200)}`)
  return `${s.totals.games} games, ${s.finished.games} finished, from ${s.totals.boards} boards`
}
