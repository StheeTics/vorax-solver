// Pulling shared boards from the collector into data/live/raw/<date>.jsonl (scripts/live/pull.ts runs it). Each
// line is a board with `received`, when the collector stored it (boards pulled before Oct 22 have only the file's date).
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Snapshot } from '../../src/solver/share/snapshot'
import { summarize, type StatRow } from '../../worker/src/stats'

const DIR = 'data/live'
const RAW = `${DIR}/raw`

interface Row { id: number; uid: string; received: string; body: string }

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

export async function pull(url: string, token: string, fetchFn: typeof fetch = fetch): Promise<number> {
  mkdirSync(RAW, { recursive: true })
  // each board keeps when it came, for the dashboard's recent games (scripts/live/summary.ts)
  return drain(url, token, '/v1/export', 'last', fetchFn, r => appendFileSync(`${RAW}/${r.received.slice(0, 10)}.jsonl`, JSON.stringify({ received: r.received, ...JSON.parse(r.body) }) + '\n'))
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

/** Works out the dashboard's numbers and sends them to the collector, which is too small to do it per request
 *  (worker/src/summary.ts). Returns a line for the log. */
export async function sendSummary(url: string, token: string, rows: StatRow[], fetchFn: typeof fetch = fetch): Promise<string> {
  const s = summarize(rows)
  const res = await fetchFn(`${url}/v1/summary`, { method: 'PUT', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(s) })
  if (!res.ok) throw new Error(`summary refused: ${res.status} ${(await res.text()).slice(0, 200)}`)
  return `${s.totals.games} games, ${s.finished.games} finished, from ${rows.length} boards`
}
