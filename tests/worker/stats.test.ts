import { summarize, type StatRow } from '../../worker/src/stats'
import { handle, type Store } from '../../worker/src/index'

const board = (run: string, round: number, extra: Record<string, unknown> = {}) => JSON.stringify({ run, seq: 0, app: '9832893', source: 'live', trigger: 'board', round, phase: 'potion', refreshes: 3, shelley: 6, corrected: [], tanks: [], hand: [], instruments: [], ...extra })
const row = (received: string, client: string, body: string): StatRow => ({ received, client, body })

describe('boards shared with unsure fields', () => {
  const t = { archetype: 'pest', rarity: 'magic', activity: 500, quantity: 1000 }
  const rows = [
    row('2026-10-19T09:00:00Z', 'a', board('g1', 13, { phase: 'protocol', tanks: [t, null, null, null, null, null] })),
    row('2026-10-19T09:00:00Z', 'b', board('g2', 13, { phase: 'protocol', tanks: [t, t, null, null, null, null], unsure: ['tank1.quantity'] })),
    row('2026-10-19T09:00:00Z', 'c', board('g3', 4, { unsure: ['hand0'] })),
  ]
  const s = summarize(rows, new Date('2026-10-19T12:00:00Z'))
  it('count as games played', () => {
    expect(s.totals.games).toBe(3)
  })
  it('the share of boards with something the reader wasn’t sure of', () => {
    expect(s.unsure).toBeCloseTo(2 / 3)
  })
  it('a final board with an unsure number isn’t counted as a finished game’s score', () => {
    expect(s.finished.finals).toEqual([500_000])
    expect(s.days[0].finished).toBe(1)
  })
})

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
      { day: '2026-10-18', boards: 3, games: 2, players: 2, website: 1, app: 1, finished: 0, averageFinal: null },
      { day: '2026-10-19', boards: 1, games: 1, players: 1, website: 1, app: 0, finished: 0, averageFinal: null },
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
    expect(s.recent[0]).toEqual({ start: '2026-10-19T09:00:00Z', boards: 1, round: 13, app: false, instruments: ['Incubation Sac'], score: 0, finished: false })
    expect(JSON.stringify(s)).not.toMatch(/"a2"|"client"/)
  })
})

describe('real results', () => {
  const tank = (activity: number, quantity: number) => ({ archetype: 'aemberon', rarity: 'boss', activity, quantity })
  const rows = [
    // a finished game: its last board is the round-13 Surgical Protocol, whose total is the final score
    row('2026-10-18T10:00:00Z', 'a', board('g1', 5, { advice: { move: 'Play X', activity: 900000, reached: 0.6 } })),
    row('2026-10-18T10:10:00Z', 'a', board('g1', 13, { phase: 'protocol', tanks: [tank(1000, 1000), null, null, null, null, null] })),
    // another, short of 950k
    row('2026-10-18T11:00:00Z', 'b', board('g2', 5, { advice: { move: 'Play Y', activity: 400000, reached: 0.1 } })),
    row('2026-10-18T11:10:00Z', 'b', board('g2', 13, { phase: 'protocol', tanks: [tank(500, 500), null, null, null, null, null] })),
    // unfinished
    row('2026-10-18T12:00:00Z', 'c', board('g3', 4)),
  ]
  const s = summarize(rows, new Date('2026-10-19T00:00:00Z'))
  it('the average final score per day, to see games getting better', () => {
    expect(s.days.map(d => [d.day, d.finished, d.averageFinal])).toEqual([['2026-10-18', 2, 625_000]])
  })
  it('the final score of every finished game, how many reached 950,000, and the average', () => {
    expect(s.finished).toEqual({ games: 2, reached: 1, finals: [1_000_000, 250_000], average: 625_000 })
  })
  it('each recent game shows its score: final when finished, else at its last board', () => {
    const byStart = Object.fromEntries(s.recent.map(g => [g.start, g]))
    expect(byStart['2026-10-18T10:00:00Z']).toMatchObject({ score: 1_000_000, finished: true })
    expect(byStart['2026-10-18T12:00:00Z']).toMatchObject({ score: 0, finished: false, round: 4 })
  })
  it('predicted against real: the advice’s chance of 950,000, in bands, against how those games ended', () => {
    expect(s.calibration).toEqual([
      { band: '0–20%', predicted: 0.1, games: 1, reached: 0 },
      { band: '60–80%', predicted: 0.6, games: 1, reached: 1 },
    ])
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
  it('the page’s script is valid JavaScript (one stray quote would leave it stuck at the password box)', async () => {
    const { DASHBOARD_HTML } = await import('../../worker/src/dashboard')
    const script = DASHBOARD_HTML.split('<script>')[1].split('</script>')[0]
    expect(() => new Function(script)).not.toThrow()
  })
  it('the page itself holds no data: it asks for the password', async () => {
    const res = await handle(new Request('https://w.dev/dashboard'), env, store)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)
    const html = await res.text()
    expect(html).toMatch(/password/i)
    expect(html).not.toMatch(/open-sesame/)
    // the automated loops' health, from GitHub's public run list
    for (const f of ['live-data.yml', 'strengths.yml', 'daily-check.yml', 'issue-fixer.yml', 'deploy.yml', 'desktop.yml']) expect(html).toContain(f)
    // players counted across days, beside today's
    expect(html).toContain('Players ever')
  })
})

describe('problems by setup: which screens, windows, HDR or browsers misread', () => {
  const dbg = (frame: [number, number], extra: Record<string, unknown> = {}) => ({ frame, dpr: 1, hdr: false, browser: 'Chrome 131', off: 0, corrected: false, tanks: [], scores: {}, ...extra })
  const rows = [
    row('2026-10-19T09:00:00Z', 'a', board('g1', 2, { debug: dbg([1920, 1080]) })),
    row('2026-10-19T09:00:00Z', 'a', board('g1', 3, { debug: dbg([1920, 1080]), unsure: ['hand0'] })),
    row('2026-10-19T09:00:00Z', 'b', board('g2', 2, { debug: dbg([1920, 1200], { hdr: true, browser: 'Electron 33', window: { outer: [1936, 1239], client: [1920, 1200], scale: 1 } }), unsure: ['tank1.activity'] })),
    row('2026-10-19T09:00:00Z', 'c', board('g3', 2, { debug: dbg([3440, 1440], { browser: 'Electron 33', window: { outer: [3440, 1440], client: [3440, 1440], scale: 1 } }) })),
    row('2026-10-19T09:00:00Z', 'd', board('g4', 2)),
  ]
  const p = summarize(rows, new Date('2026-10-19T12:00:00Z')).problems
  const find = (by: string, group: string) => p.find(x => x.by === by && x.group === group)
  it('by screen shape', () => {
    expect(find('screen', '16:9')).toEqual({ by: 'screen', group: '16:9', boards: 2, unsure: 0.5, numbers: 0 })
    expect(find('screen', '16:10')).toEqual({ by: 'screen', group: '16:10', boards: 1, unsure: 1, numbers: 1 })
    expect(find('screen', '21:9')).toMatchObject({ boards: 1, unsure: 0 })
  })
  it('by window: the app says whether the game is windowed (its title bar and borders) or borderless', () => {
    expect(find('window', 'windowed')).toMatchObject({ boards: 1, numbers: 1 })
    expect(find('window', 'borderless or fullscreen')).toMatchObject({ boards: 1 })
    expect(find('window', 'website')).toMatchObject({ boards: 2 })
  })
  it('by HDR and by browser, without its version', () => {
    expect(find('HDR', 'on')).toMatchObject({ boards: 1 })
    expect(find('HDR', 'off')).toMatchObject({ boards: 3 })
    expect(find('browser', 'Electron (app)')).toMatchObject({ boards: 2 })
    expect(find('browser', 'Chrome')).toMatchObject({ boards: 2 })
  })
  it('a picture that wasn’t the game screen counts as a board read with nothing sure', () => {
    const q = summarize([row('2026-10-19T09:00:00Z', 'e', board('g9', 1, { debug: dbg([1866, 1080], { browser: 'Electron 44', window: { outer: [1936, 1119], client: [1920, 1080], scale: 1 } }), unreadable: true }))], new Date('2026-10-19T12:00:00Z')).problems
    expect(q.find(x => x.by === 'window' && x.group === 'windowed')).toMatchObject({ boards: 1, unsure: 1, numbers: 1 })
  })
  it('boards from before the setup was shared aren’t counted', () => {
    expect(p.filter(x => x.by === 'screen').reduce((s, x) => s + x.boards, 0)).toBe(4)
  })
})

describe('players ever', () => {
  const i1 = '11111111-1111-4111-8111-111111111111', i2 = '22222222-2222-4222-8222-222222222222'
  const rows = [
    // boards from before the install number: counted only as player-days
    row('2026-10-18T10:00:00Z', 'a', board('g1', 1)),
    row('2026-10-19T09:00:00Z', 'b', board('g2', 1, { install: i1 })),
    row('2026-10-20T09:00:00Z', 'c', board('g3', 1, { install: i1 })),
    row('2026-10-20T10:00:00Z', 'd', board('g4', 1, { install: i2 })),
  ]
  const s = summarize(rows, new Date('2026-10-20T12:00:00Z'))
  it('the same install on two days is one player', () => {
    expect(s.totals.playersEver).toBe(2)
    expect(s.totals.countedSince).toBe('2026-10-19')
  })
  it('player-days: every day’s players added up, for the days before installs were counted', () => {
    expect(s.totals.playerDays).toBe(4)
  })
})
