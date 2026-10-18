// Pulling shared boards from the collector into data/live/raw/<date>.jsonl (scripts/live/pull.ts runs it).
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Snapshot } from '../../src/solver/share/snapshot'

const DIR = 'data/live'
const RAW = `${DIR}/raw`

interface Row { id: number; uid: string; received: string; body: string }

// Where each export was read up to: { last } for boards, { icons } for named panel icons.
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
  return drain(url, token, '/v1/export', 'last', fetchFn, r => appendFileSync(`${RAW}/${r.received.slice(0, 10)}.jsonl`, r.body + '\n'))
}

/** Panel icons players named, into data/live/icons.jsonl: checked by hand before they join the reader's data. */
export async function pullIcons(url: string, token: string, fetchFn: typeof fetch = fetch): Promise<number> {
  mkdirSync(DIR, { recursive: true })
  return drain(url, token, '/v1/icons/export', 'icons', fetchFn, r => appendFileSync(`${DIR}/icons.jsonl`, r.body + '\n'))
}

export function allRows(): Snapshot[] {
  if (!existsSync(RAW)) return []
  return readdirSync(RAW).filter(f => f.endsWith('.jsonl')).sort()
    .flatMap(f => readFileSync(`${RAW}/${f}`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Snapshot))
}
