// The live-data collector: a Cloudflare Worker with a D1 database. The Solver posts the boards it read;
// the repo's scheduled workflow pulls them with the export token. No addresses are stored: the daily
// quota is counted against a salted hash that changes every day.
import names from './names.json'
import { validate, validateCard, validateIcon } from './validate'
import { summarize, type StatRow } from './stats'
import { DASHBOARD_HTML } from './dashboard'
import { dispatch, onSchedule, RUNNABLE } from './schedule'

export interface Store {
  /** stores rows with new uids; returns how many were new */
  insert(rows: { uid: string; client: string; body: string }[]): Promise<number>
  used(key: string, day: string): Promise<number>
  addUsed(key: string, day: string, n: number): Promise<void>
  export(after: number, limit: number): Promise<{ id: number; uid: string; client: string; body: string }[]>
  /** stores an icon with a new uid; returns 1 if it was new */
  insertIcon(row: { uid: string; client: string; body: string }): Promise<number>
  exportIcons(after: number, limit: number): Promise<{ id: number; uid: string; client: string; body: string }[]>
  /** stores a card the Solver couldn't name, with a new uid; returns 1 if it was new */
  insertCard(row: { uid: string; client: string; body: string }): Promise<number>
  exportCards(after: number, limit: number): Promise<{ id: number; uid: string; client: string; body: string }[]>
  /** every board with when it came and its daily player code, for the dashboard's counts */
  stats(): Promise<StatRow[]>
}

export interface Env {
  EXPORT_TOKEN: string
  /** the analytics page's password (wrangler secret put DASHBOARD_TOKEN) */
  DASHBOARD_TOKEN?: string
  /** starts the repo's workflows on schedule (src/schedule.ts) */
  GITHUB_DISPATCH_TOKEN?: string
  IP_SALT: string
  LIMIT: { limit(o: { key: string }): Promise<{ success: boolean }> }
  DB?: D1Like
}

interface D1Like {
  prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<{ meta: { changes: number } }>; first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }> } }
}

const ORIGIN = 'https://tidewarden.github.io'
/** also the local test server: Vorax Overlay pointed at it plays real games (any other origin gets the site's) */
const ORIGINS = [ORIGIN, 'http://localhost:5173']
const DAILY = 1500
const MAX_BATCH = 10
const MAX_BYTES = 64_000
const EXPORT_MAX = 5000

const corsFor = (req: Request) => {
  const origin = req.headers.get('origin') ?? ''
  return { 'access-control-allow-origin': ORIGINS.includes(origin) ? origin : ORIGIN, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' }
}
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...extra } })

async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('')
}

export async function handle(req: Request, env: Env, store: Store): Promise<Response> {
  const url = new URL(req.url)
  const cors = corsFor(req)
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

  // a card the Solver couldn't name: one at a time, so its picture never weighs down a batch of boards
  if (url.pathname === '/v1/cards' && req.method === 'POST') {
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
    const card = validateCard(raw)
    if (!card) return json({ error: 'not a card' }, 400, cors)
    // a card counts as one board towards the daily limit
    if ((await store.used(client, day)) + 1 > DAILY) return json({ error: 'daily limit' }, 429, cors)
    const stored = await store.insertCard({ uid: card.uid as string, client, body: JSON.stringify(card) })
    await store.addUsed(client, day, stored)
    return json({ stored }, 200, cors)
  }

  if (url.pathname === '/v1/cards/export' && req.method === 'GET') {
    if (req.headers.get('authorization') !== `Bearer ${env.EXPORT_TOKEN}`) return json({ error: 'token' }, 401)
    const after = Math.max(0, Number(url.searchParams.get('after')) || 0)
    const rows = await store.exportCards(after, EXPORT_MAX)
    return json({ rows, last: rows.length ? rows[rows.length - 1].id : after })
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

  // The private analytics page and its numbers (counts only; see stats.ts).
  if (url.pathname === '/dashboard' && req.method === 'GET') {
    return new Response(DASHBOARD_HTML, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } })
  }
  // Run now, on the dashboard: starts one of the repo's loops (with the dashboard password)
  const run = /^\/v1\/run\/([\w.-]+)$/.exec(url.pathname)
  if (run && req.method === 'POST') {
    if (!env.DASHBOARD_TOKEN || req.headers.get('authorization') !== `Bearer ${env.DASHBOARD_TOKEN}`) return json({ error: 'password' }, 401)
    if (!RUNNABLE.has(run[1])) return json({ error: 'not a loop' }, 404)
    const why = await dispatch(run[1], env.GITHUB_DISPATCH_TOKEN)
    return why ? json({ error: why }, 502) : json({ started: run[1] })
  }
  if (url.pathname === '/v1/stats' && req.method === 'GET') {
    if (!env.DASHBOARD_TOKEN || req.headers.get('authorization') !== `Bearer ${env.DASHBOARD_TOKEN}`) return json({ error: 'password' }, 401)
    return json(summarize(await store.stats()), 200, { 'cache-control': 'no-store' })
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
    async insertCard(r) {
      const res = await db.prepare('INSERT OR IGNORE INTO cards (uid, received, client, body) VALUES (?, ?, ?, ?)').bind(r.uid, new Date().toISOString(), r.client, r.body).run()
      return res.meta.changes
    },
    async exportCards(after, limit) {
      const { results } = await db.prepare('SELECT id, uid, received, body FROM cards WHERE id > ? ORDER BY id LIMIT ?').bind(after, limit).all<{ id: number; uid: string; client: string; body: string }>()
      return results
    },
    async stats() {
      const { results } = await db.prepare('SELECT received, client, body FROM snapshots ORDER BY id').bind().all<StatRow>()
      return results
    },
  }
}

export default {
  fetch: (req: Request, env: Env) => handle(req, env, d1Store(env.DB!)),
  scheduled: (event: { cron: string }, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) => ctx.waitUntil(onSchedule(event.cron, env)),
}
