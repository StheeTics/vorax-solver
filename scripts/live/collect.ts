// Pulling shared boards from the collector into data/live/raw/<date>.jsonl (scripts/live/pull.ts runs it).
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Snapshot } from '../../src/solver/share/snapshot'

const DIR = 'data/live'
const RAW = `${DIR}/raw`

interface Row { id: number; uid: string; received: string; body: string }

export async function pull(url: string, token: string, fetchFn: typeof fetch = fetch): Promise<number> {
  mkdirSync(RAW, { recursive: true })
  const statePath = `${DIR}/state.json`
  let last = existsSync(statePath) ? (JSON.parse(readFileSync(statePath, 'utf8')) as { last: number }).last : 0
  let added = 0
  for (;;) {
    const res = await fetchFn(`${url}/v1/export?after=${last}`, { headers: { authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`export failed: ${res.status}`)
    const { rows, last: next } = (await res.json()) as { rows: Row[]; last: number }
    for (const r of rows) appendFileSync(`${RAW}/${r.received.slice(0, 10)}.jsonl`, r.body + '\n')
    added += rows.length
    if (!rows.length || next === last) break
    last = next
  }
  writeFileSync(statePath, JSON.stringify({ last }) + '\n')
  return added
}

export function allRows(): Snapshot[] {
  if (!existsSync(RAW)) return []
  return readdirSync(RAW).filter(f => f.endsWith('.jsonl')).sort()
    .flatMap(f => readFileSync(`${RAW}/${f}`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Snapshot))
}
