import { summarize, type StatRow } from '../../worker/src/stats'
import { handle, type Store } from '../../worker/src/index'

const board = (run: string, round: number, extra: Record<string, unknown> = {}) => JSON.stringify({ run, seq: 0, app: '9832893', source: 'live', trigger: 'board', round, phase: 'potion', refreshes: 3, shelley: 6, corrected: [], tanks: [], hand: [], instruments: [], ...extra })
const row = (received: string, client: string, body: string): StatRow => ({ received, client, body })

describe('the dashboard summary', () => {
  const rows = [
    row('2026-10-18T10:00:00Z', 'a', board('g1', 1)),
    row('2026-10-18T10:05:00Z', 'a', board('g1', 7, { corrected: ['tank1.activity'] })),
    row('2026-10-18T11:00:00Z', 'b', board('g2', 3, { app: '9832893-overlay' })),
    row('2026-10-19T09:00:00Z', 'a2', board('g3', 13, { instruments: ['Incubation Sac'] })),
  ]
  const s = summarize(rows, new Date('2026-10-19T12:00:00Z'))

  it('counts boards, games and players (different devices) per day', () => {
    expect(s.days).toEqual([
      { day: '2026-10-18', boards: 3, games: 2, players: 2, website: 1, app: 1 },
      { day: '2026-10-19', boards: 1, games: 1, players: 1, website: 1, app: 0 },
    ])
    expect(s.totals).toMatchObject({ boards: 4, games: 3 })
  })
  it('how far games got: the highest round each reached', () => {
    expect(s.rounds).toEqual({ 3: 1, 7: 1, 13: 1 })
  })
  it('the share of boards a player had to correct', () => {
    expect(s.corrected).toBe(0.25)
  })
  it('the latest games, newest first, without anything about who played', () => {
    expect(s.recent[0]).toEqual({ start: '2026-10-19T09:00:00Z', boards: 1, round: 13, app: false, instruments: ['Incubation Sac'] })
    expect(JSON.stringify(s)).not.toMatch(/"a2"|"client"/)
  })
})

describe('the dashboard routes', () => {
  const store = { stats: async () => [row('2026-10-18T10:00:00Z', 'a', board('g1', 2))] } as unknown as Store
  const env = { EXPORT_TOKEN: 'x', IP_SALT: 's', DASHBOARD_TOKEN: 'open-sesame', LIMIT: { limit: async () => ({ success: true }) } }
  it('the numbers need the dashboard password', async () => {
    expect((await handle(new Request('https://w.dev/v1/stats'), env, store)).status).toBe(401)
    expect((await handle(new Request('https://w.dev/v1/stats', { headers: { authorization: 'Bearer x' } }), env, store)).status).toBe(401)
    const ok = await handle(new Request('https://w.dev/v1/stats', { headers: { authorization: 'Bearer open-sesame' } }), env, store)
    expect(ok.status).toBe(200)
    expect((await ok.json()).totals.games).toBe(1)
  })
  it('the page itself holds no data: it asks for the password', async () => {
    const res = await handle(new Request('https://w.dev/dashboard'), env, store)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)
    const html = await res.text()
    expect(html).toMatch(/password/i)
    expect(html).not.toMatch(/open-sesame/)
  })
})
