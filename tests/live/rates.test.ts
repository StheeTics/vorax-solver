import { LIVE_WEIGHTS } from '@/data/liveWeights'
import { computeRates, wilson } from '../../scripts/live/rates'
import type { Snapshot } from '@/solver/share/snapshot'

const base = (o: Partial<Snapshot>): Snapshot => ({
  uid: Math.random().toString(), run: 'r1', seq: 0, app: 'a', source: 'live', trigger: 'board', round: 1, phase: 'potion', refreshes: 3,
  tanks: [null, null, null, null, null, null], hand: [], instruments: [], shelley: 6, corrected: [], ...o,
})

it('Wilson bounds for 30 of 100', () => {
  const w = wilson(30, 100)
  expect(w.lo).toBeCloseTo(0.219, 2)
  expect(w.hi).toBeCloseTo(0.396, 2)
})

it('counts offers, instruments and starting tanks from a run', () => {
  const rows = [
    base({ seq: 0, phase: 'instrument', hand: ['Hypertrophic Pituitary', 'Contracted Claws', 'Adherent Metatarsals'], refreshes: 2,
      tanks: [{ archetype: 'pest', rarity: 'magic', activity: 5, quantity: 24 }, { archetype: 'agito', rarity: 'normal', activity: 1, quantity: 36 }, null, null, null, null] }),
    base({ seq: 1, round: 1, hand: ['Xeno-Hormone', 'Mutagenic Powder', 'Green Bile Solution'] }),
    base({ seq: 2, round: 2, hand: ['Xeno-Hormone', 'Purest Holy Water', 'Green Bile Solution'] }),
  ]
  const r = computeRates(rows)
  expect(r.boards).toBe(3)
  expect(r.runs).toBe(1)
  expect(r.potionOffer['Xeno-Hormone'].count).toBe(2)
  expect(r.potionOffer['Xeno-Hormone'].n).toBe(6)
  expect(r.supreme.count).toBe(1)
  expect(r.supreme.n).toBe(6)
  expect(r.instrumentOffer.basic['Hypertrophic Pituitary'].count).toBe(1)
  expect(r.spawnRarity.magic.count).toBe(1)
  expect(r.spawnRarity.normal.count).toBe(1)
  expect(r.spawnRarity.normal.n).toBe(2)
  expect(r.spawnArchetype.pest.count).toBe(1)
  expect(r.supreme.engine).toBe(LIVE_WEIGHTS.supremeChance)
})

it('the same offer read twice in one round counts once', () => {
  const offer = { round: 4, refreshes: 2, hand: ['Xeno-Hormone', 'Mutagenic Powder', 'Green Bile Solution'] }
  const r = computeRates([base({ seq: 3, ...offer }), base({ seq: 4, ...offer })])
  expect(r.potionOffer['Xeno-Hormone'].n).toBe(3)
})

it('pull pages through the export until it runs dry', async () => {
  const { pull } = await import('../../scripts/live/collect')
  const { mkdtempSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const dir = mkdtempSync(`${tmpdir()}/pull-`)
  const cwd = process.cwd()
  process.chdir(dir)
  try {
    const pages = [
      { rows: [{ id: 1, uid: 'a', received: '2026-10-18T01:00:00Z', body: '{"x":1}' }, { id: 2, uid: 'b', received: '2026-10-19T01:00:00Z', body: '{"x":2}' }], last: 2 },
      { rows: [], last: 2 },
    ]
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(pages.shift())))
    expect(await pull('https://w.dev', 't', fetchFn as unknown as typeof fetch)).toBe(2)
    expect((fetchFn.mock.calls[0] as unknown[])[0]).toBe('https://w.dev/v1/export?after=0')
    const fs = await import('node:fs')
    expect(fs.readFileSync('data/live/raw/2026-10-19.jsonl', 'utf8')).toBe('{"x":2}\n')
    expect(JSON.parse(fs.readFileSync('data/live/state.json', 'utf8')).last).toBe(2)
  } finally {
    process.chdir(cwd)
  }
})

it('pullIcons saves shared icons beside the boards, keeping the boards’ place in the export', async () => {
  const { pull, pullIcons } = await import('../../scripts/live/collect')
  const fs = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const dir = fs.mkdtempSync(`${tmpdir()}/icons-`)
  const cwd = process.cwd()
  process.chdir(dir)
  try {
    const answers: Record<string, unknown[]> = {
      '/v1/export?after=0': [{ rows: [{ id: 5, uid: 'a', received: '2026-10-18T01:00:00Z', body: '{"x":1}' }], last: 5 }],
      '/v1/export?after=5': [{ rows: [], last: 5 }, { rows: [], last: 5 }],
      '/v1/icons/export?after=0': [{ rows: [{ id: 3, uid: 'i', received: '2026-10-18T02:00:00Z', body: '{"name":"Egg-Burdened Butterfly"}' }], last: 3 }],
      '/v1/icons/export?after=3': [{ rows: [], last: 3 }],
    }
    const fetchFn = vi.fn(async (u: string) => new Response(JSON.stringify(answers[u.replace('https://w.dev', '')].shift())))
    await pull('https://w.dev', 't', fetchFn as unknown as typeof fetch)
    expect(await pullIcons('https://w.dev', 't', fetchFn as unknown as typeof fetch)).toBe(1)
    expect(fs.readFileSync('data/live/icons.jsonl', 'utf8')).toBe('{"name":"Egg-Burdened Butterfly"}\n')
    expect(JSON.parse(fs.readFileSync('data/live/state.json', 'utf8'))).toEqual({ last: 5, icons: 3 })
    await pull('https://w.dev', 't', fetchFn as unknown as typeof fetch)
    expect(JSON.parse(fs.readFileSync('data/live/state.json', 'utf8'))).toEqual({ last: 5, icons: 3 })
  } finally {
    process.chdir(cwd)
  }
})
