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
        // prepared when run: a batch's statements can use a table an earlier one makes
        const st = () => db.prepare(sql)
        const args = v as (string | number | null)[]
        return {
          run: async () => ({ meta: { changes: Number(st().run(...args).changes) } }),
          first: async <T>() => (st().get(...args) ?? null) as T | null,
          all: async <T>() => ({ results: st().all(...args) as T[] }),
        }
      },
    }),
    batch: async (list: { run(): Promise<unknown> }[]) => {
      db.exec('BEGIN')
      for (const s of list) await s.run()
      db.exec('COMMIT')
    },
  }
  return { db, store: d1Store(wrap) }
}

describe('one row per upload, not per board', () => {
  it('an upload of several boards is one row, exported with ids from BATCHES on', async () => {
    const { db, store } = d1()
    await store.insertBatch('[{"uid":"c"},{"uid":"d"}]')
    await store.insertBatch('[{"uid":"e"}]')
    expect(db.prepare('SELECT COUNT(*) n FROM batches').get()).toEqual({ n: 2 })

    const all = await store.export(0, 5000)
    expect(all.map(r => [r.id, r.body])).toEqual([[BATCHES + 1, '[{"uid":"c"},{"uid":"d"}]'], [BATCHES + 2, '[{"uid":"e"}]']])
    expect(all[0].received).toMatch(/^\d{4}-\d\d-\d\dT/)
    expect(await store.export(BATCHES + 1, 5000)).toEqual([expect.objectContaining({ id: BATCHES + 2 })])
    expect(await store.export(BATCHES + 2, 5000)).toEqual([])
  })

  it('a page of uploads is about as many boards as a page of single boards was', async () => {
    const { store } = d1()
    for (let i = 0; i < 30; i++) await store.insertBatch('[]')
    expect(await store.export(0, 100)).toHaveLength(10)
  })
})

describe('emptying the uploads once pulled', () => {
  it('drops the uploads before the one pulled last; it and any after stay, and ids carry on from them', async () => {
    const { db, store } = d1()
    for (const u of ['a', 'b', 'c', 'd']) await store.insertBatch(`[{"uid":"${u}"}]`)
    expect(await store.rotate(BATCHES + 2)).toEqual({ kept: 3, dropped: 1 })
    expect(db.prepare('SELECT id FROM batches').all()).toEqual([{ id: 2 }, { id: 3 }, { id: 4 }])
    // the pull goes on from where it was: what came meanwhile is still there
    expect((await store.export(BATCHES + 2, 5000)).map(r => r.id)).toEqual([BATCHES + 3, BATCHES + 4])
    await store.insertBatch('[{"uid":"e"}]')
    expect((await store.export(BATCHES + 4, 5000)).map(r => [r.id, r.body])).toEqual([[BATCHES + 5, '[{"uid":"e"}]']])
  })
  it('nothing happens for an id it doesn’t have', async () => {
    const { db, store } = d1()
    await store.insertBatch('[]')
    expect(await store.rotate(BATCHES + 7)).toBeNull()
    expect(db.prepare('SELECT COUNT(*) n FROM batches').get()).toEqual({ n: 1 })
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
