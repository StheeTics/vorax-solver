// @vitest-environment node
import { handle, type Store } from '../../worker/src/index'

function memory(): Store & { rows: { id: number; uid: string; client: string; body: string }[]; quota: Map<string, number> } {
  const rows: { id: number; uid: string; client: string; body: string }[] = []
  const quota = new Map<string, number>()
  return {
    rows,
    quota,
    async insert(list) {
      let n = 0
      for (const r of list) {
        if (rows.some(x => x.uid === r.uid)) continue
        rows.push({ id: rows.length + 1, ...r })
        n++
      }
      return n
    },
    async used(key) {
      return quota.get(key) ?? 0
    },
    async addUsed(key, _day, n) {
      quota.set(key, (quota.get(key) ?? 0) + n)
    },
    async export(after, limit) {
      return rows.filter(r => r.id > after).slice(0, limit)
    },
  }
}

const env = { EXPORT_TOKEN: 'secret', IP_SALT: 'salt', LIMIT: { limit: async () => ({ success: true }) } }
const snap = (uid: string) => ({
  uid, run: '5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', seq: 0, app: 'abc', source: 'live', trigger: 'board', round: 1, phase: 'potion', refreshes: 3, shelley: 6, corrected: [],
  tanks: [null, null, null, null, null, null], hand: ['Xeno-Hormone'], instruments: [],
})
const uid = (n: number) => `0b6f1f4e-6a37-4c1e-9d0e-${String(n).padStart(12, '0')}`
const post = (body: unknown, ip = '9.9.9.9') => new Request('https://w.dev/v1/snapshots', { method: 'POST', body: JSON.stringify(body), headers: { 'cf-connecting-ip': ip, origin: 'https://tidewarden.github.io' } })

it('stores valid snapshots once, drops the rest', async () => {
  const store = memory()
  const res = await handle(post([snap(uid(1)), snap(uid(1)), { junk: true }]), env, store)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ stored: 1, dropped: 2 })
  expect(store.rows).toHaveLength(1)
})

it('never stores the address', async () => {
  const store = memory()
  await handle(post([snap(uid(1))], '1.2.3.4'), env, store)
  expect(JSON.stringify(store.rows)).not.toContain('1.2.3.4')
  expect([...store.quota.keys()].join()).not.toContain('1.2.3.4')
})

it('takes 1 to 10 snapshots per upload', async () => {
  expect((await handle(post([]), env, memory())).status).toBe(400)
  expect((await handle(post(Array.from({ length: 11 }, (_, i) => snap(uid(i)))), env, memory())).status).toBe(400)
})

it('limits each address to 1,500 snapshots a day', async () => {
  const store = memory()
  for (const k of store.quota.keys()) store.quota.delete(k)
  await handle(post([snap(uid(1))]), env, store)
  const key = [...store.quota.keys()][0]
  store.quota.set(key, 1500)
  expect((await handle(post([snap(uid(2))]), env, store)).status).toBe(429)
})

it('rate-limited uploads get 429', async () => {
  const limited = { ...env, LIMIT: { limit: async () => ({ success: false }) } }
  expect((await handle(post([snap(uid(1))]), limited, memory())).status).toBe(429)
})

it('export needs the token', async () => {
  const store = memory()
  await handle(post([snap(uid(1)), snap(uid(2))]), env, store)
  expect((await handle(new Request('https://w.dev/v1/export?after=0'), env, store)).status).toBe(401)
  const res = await handle(new Request('https://w.dev/v1/export?after=1', { headers: { authorization: 'Bearer secret' } }), env, store)
  const body = await res.json() as { rows: { id: number }[]; last: number }
  expect(body.rows.map(r => r.id)).toEqual([2])
  expect(body.last).toBe(2)
})

it('CORS allows only the published site', async () => {
  const res = await handle(new Request('https://w.dev/v1/snapshots', { method: 'OPTIONS', headers: { origin: 'https://tidewarden.github.io' } }), env, memory())
  expect(res.headers.get('access-control-allow-origin')).toBe('https://tidewarden.github.io')
  const other = await handle(new Request('https://w.dev/v1/snapshots', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), env, memory())
  expect(other.headers.get('access-control-allow-origin')).toBe('https://tidewarden.github.io')
})

it('anything else is 404', async () => {
  expect((await handle(new Request('https://w.dev/'), env, memory())).status).toBe(404)
})

it('refuses an oversized body without reading it as JSON', async () => {
  const big = new Request('https://w.dev/v1/snapshots', { method: 'POST', body: JSON.stringify([{ pad: 'x'.repeat(70_000) }]), headers: { 'cf-connecting-ip': '9.9.9.9' } })
  expect((await handle(big, env, memory())).status).toBe(413)
})
