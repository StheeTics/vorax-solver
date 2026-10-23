// @vitest-environment node
// The collector's SQL, run against schema.sql in SQLite (D1 is SQLite)
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type * as Sqlite from 'node:sqlite'
import { BATCHES, d1Store } from '../../worker/src/index'

// through require: Vite doesn't know node:sqlite as a built-in yet
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof Sqlite

function d1() {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync('worker/schema.sql', 'utf8'))
  const wrap = {
    prepare: (sql: string) => ({
      bind: (...v: unknown[]) => {
        const st = db.prepare(sql)
        const args = v as (string | number | null)[]
        return {
          run: async () => ({ meta: { changes: Number(st.run(...args).changes) } }),
          first: async <T>() => (st.get(...args) ?? null) as T | null,
          all: async <T>() => ({ results: st.all(...args) as T[] }),
        }
      },
    }),
  }
  return { db, store: d1Store(wrap) }
}

describe('one row per upload, not per board', () => {
  it('an upload of several boards is one row, exported after the boards stored one per row before', async () => {
    const { db, store } = d1()
    // boards stored before the change, one per row
    db.prepare("INSERT INTO snapshots (uid, received, client, body) VALUES ('a', '2026-10-22T10:00:00Z', 'c1', '{\"uid\":\"a\"}')").run()
    db.prepare("INSERT INTO snapshots (uid, received, client, body) VALUES ('b', '2026-10-22T11:00:00Z', 'c1', '{\"uid\":\"b\"}')").run()
    await store.insertBatch('[{"uid":"c"},{"uid":"d"}]')
    await store.insertBatch('[{"uid":"e"}]')
    expect(db.prepare('SELECT COUNT(*) n FROM batches').get()).toEqual({ n: 2 })

    const first = await store.export(0, 5000)
    expect(first.map(r => [r.id, r.body])).toEqual([[1, '{"uid":"a"}'], [2, '{"uid":"b"}']])
    const next = await store.export(2, 5000)
    expect(next.map(r => [r.id, r.body])).toEqual([[BATCHES + 1, '[{"uid":"c"},{"uid":"d"}]'], [BATCHES + 2, '[{"uid":"e"}]']])
    expect(next[0].received).toMatch(/^\d{4}-\d\d-\d\dT/)
    expect(await store.export(BATCHES + 1, 5000)).toEqual([expect.objectContaining({ id: BATCHES + 2 })])
    expect(await store.export(BATCHES + 2, 5000)).toEqual([])
  })

  it('a page of uploads is about as many boards as a page of single boards was', async () => {
    const { store } = d1()
    for (let i = 0; i < 30; i++) await store.insertBatch('[]')
    expect(await store.export(0, 100)).toHaveLength(10)
  })
})

describe('players per day, counted as they come', () => {
  it('a player is one row a day, however often they upload', async () => {
    const { db, store } = d1()
    await store.seePlayer('2026-10-23', 'c1')
    await store.seePlayer('2026-10-23', 'c1')
    await store.seePlayer('2026-10-23', 'c2')
    await store.seePlayer('2026-10-24', 'c1')
    expect(db.prepare('SELECT COUNT(*) n FROM players').get()).toEqual({ n: 3 })
    expect(await store.dayCounts()).toEqual([{ day: '2026-10-23', players: 2 }, { day: '2026-10-24', players: 1 }])
  })
})
