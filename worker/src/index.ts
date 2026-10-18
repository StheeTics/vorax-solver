// The live-data collector: a Cloudflare Worker with a D1 database. The Solver posts the boards it read;
// the repo's scheduled workflow pulls them with the export token. No addresses are stored: the daily
// quota is counted against a salted hash that changes every day.
import names from './names.json'
import { validate, validateIcon } from './validate'

export interface Store {
  /** stores rows with new uids; returns how many were new */
  insert(rows: { uid: string; client: string; body: string }[]): Promise<number>
  used(key: string, day: string): Promise<number>
  addUsed(key: string, day: string, n: number): Promise<void>
  export(after: number, limit: number): Promise<{ id: number; uid: string; client: string; body: string }[]>
  /** stores an icon with a new uid; returns 1 if it was new */
  insertIcon(row: { uid: string; client: string; body: string }): Promise<number>
  exportIcons(after: number, limit: number): Promise<{ id: number; uid: string; client: string; body: string }[]>
}

export interface Env {
  EXPORT_TOKEN: string
  IP_SALT: string
  LIMIT: { limit(o: { key: string }): Promise<{ success: boolean }> }
  DB?: D1Like
}

interface D1Like {
  prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<{ meta: { changes: number } }>; first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }> } }
}

const ORIGIN = 'https://tidewarden.github.io'
const DAILY = 1500
const MAX_BATCH = 10
const MAX_BYTES = 64_000
const EXPORT_MAX = 5000

const cors = { 'access-control-allow-origin': ORIGIN, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' }
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...extra } })

async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('')
}

export async function handle(req: Request, env: Env, store: Store): Promise<Response> {
  const url = new URL(req.url)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  if (url.pathname === '/v1/snapshots' && req.method === 'POST') {
    const ip = req.headers.get('cf-connecting-ip') ?? 'unknown'
    const day = new Date().toISOString().slice(0, 10)
    const client = (await sha256(`${env.IP_SALT}|${day}|${ip}`)).slice(0, 24)
    if (!(await env.LIMIT.limit({ key: client })).success) return json({ error: 'slow down' }, 429, cors)
    // ten snapshots are a few kilobytes: anything far bigger isn't from the Solver
    const text = await req.text()
    if (text.length > MAX_BYTES) return json({ error: 'too large' }, 413, cors)
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch {
      return json({ error: 'not JSON' }, 400, cors)
    }
    if (!Array.isArray(body) || body.length < 1 || body.length > MAX_BATCH) return json({ error: `1 to ${MAX_BATCH} snapshots` }, 400, cors)
    const valid = body.map(s => validate(s, names)).filter(s => s !== null)
    if ((await store.used(client, day)) + valid.length > DAILY) return json({ error: 'daily limit' }, 429, cors)
    const stored = await store.insert(valid.map(s => ({ uid: s.uid as string, client, body: JSON.stringify(s) })))
    await store.addUsed(client, day, stored)
    return json({ stored, dropped: body.length - stored }, 200, cors)
  }

  if (url.pathname === '/v1/icons' && req.method === 'POST') {
    const ip = req.headers.get('cf-connecting-ip') ?? 'unknown'
    const day = new Date().toISOString().slice(0, 10)
    const client = (await sha256(`${env.IP_SALT}|${day}|${ip}`)).slice(0, 24)
    if (!(await env.LIMIT.limit({ key: client })).success) return json({ error: 'slow down' }, 429, cors)
    const text = await req.text()
    if (text.length > MAX_BYTES) return json({ error: 'too large' }, 413, cors)
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return json({ error: 'not JSON' }, 400, cors)
    }
    const icon = validateIcon(raw, names)
    if (!icon) return json({ error: 'not an icon' }, 400, cors)
    // an icon counts as one board towards the daily limit
    if ((await store.used(client, day)) + 1 > DAILY) return json({ error: 'daily limit' }, 429, cors)
    const stored = await store.insertIcon({ uid: icon.uid as string, client, body: JSON.stringify(icon) })
    await store.addUsed(client, day, stored)
    return json({ stored }, 200, cors)
  }

  if (url.pathname === '/v1/icons/export' && req.method === 'GET') {
    if (req.headers.get('authorization') !== `Bearer ${env.EXPORT_TOKEN}`) return json({ error: 'token' }, 401)
    const after = Math.max(0, Number(url.searchParams.get('after')) || 0)
    const rows = await store.exportIcons(after, EXPORT_MAX)
    return json({ rows, last: rows.length ? rows[rows.length - 1].id : after })
  }

  if (url.pathname === '/v1/export' && req.method === 'GET') {
    if (req.headers.get('authorization') !== `Bearer ${env.EXPORT_TOKEN}`) return json({ error: 'token' }, 401)
    const after = Math.max(0, Number(url.searchParams.get('after')) || 0)
    const rows = await store.export(after, EXPORT_MAX)
    return json({ rows, last: rows.length ? rows[rows.length - 1].id : after })
  }

  return json({ error: 'not found' }, 404)
}

/** The D1 tables in schema.sql. */
export function d1Store(db: D1Like): Store {
  return {
    async insert(rows) {
      let n = 0
      const received = new Date().toISOString()
      for (const r of rows) {
        const res = await db.prepare('INSERT OR IGNORE INTO snapshots (uid, received, client, body) VALUES (?, ?, ?, ?)').bind(r.uid, received, r.client, r.body).run()
        n += res.meta.changes
      }
      return n
    },
    async used(key, day) {
      const row = await db.prepare('SELECT n FROM quota WHERE key = ? AND day = ?').bind(key, day).first<{ n: number }>()
      return row?.n ?? 0
    },
    async addUsed(key, day, n) {
      await db.prepare('INSERT INTO quota (key, day, n) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET n = CASE WHEN day = excluded.day THEN n + excluded.n ELSE excluded.n END, day = excluded.day').bind(key, day, n).run()
    },
    async export(after, limit) {
      const { results } = await db.prepare('SELECT id, uid, received, body FROM snapshots WHERE id > ? ORDER BY id LIMIT ?').bind(after, limit).all<{ id: number; uid: string; client: string; body: string }>()
      return results
    },
    async insertIcon(r) {
      const res = await db.prepare('INSERT OR IGNORE INTO icons (uid, received, client, body) VALUES (?, ?, ?, ?)').bind(r.uid, new Date().toISOString(), r.client, r.body).run()
      return res.meta.changes
    },
    async exportIcons(after, limit) {
      const { results } = await db.prepare('SELECT id, uid, received, body FROM icons WHERE id > ? ORDER BY id LIMIT ?').bind(after, limit).all<{ id: number; uid: string; client: string; body: string }>()
      return results
    },
  }
}

export default {
  fetch: (req: Request, env: Env) => handle(req, env, d1Store(env.DB!)),
}
