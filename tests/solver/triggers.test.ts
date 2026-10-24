import { readFileSync } from 'node:fs'
import { classify, createSettler, isAnimation, logTime, uiScaleOf } from '@/solver/live/triggers'

const fixture = readFileSync('tests/fixtures/vorax-log-excerpt.log', 'utf8').split('\n').filter(Boolean)
const find = (s: string) => fixture.find(l => l.includes(s))!
const ANIM = "LogDataTable: Warning: UDataTable::FindRow : 'Play_UI_S13_KYZ_Card_Figure_Add_Small' requested row"

it('classifies real log lines', () => {
  expect(classify(find('ProtoId = 5619'))).toBe('board')
  expect(classify(find('normal-click RefreshBtn'))).toBeNull()
  expect(classify(find("'S13GamePlayMain_C_RefreshBtn'"))).toBe('refresh')
  expect(classify(find('S13GamePlayMain Run'))).toBe('screen')
  expect(classify(find('S13GamePlayMain Hide'))).toBe('over')
  expect(classify(find('ProtoId = 5621'))).toBe('over')
  expect(classify('[Game] S13GamePlayMain Destory')).toBe('over')
  expect(classify('[Game] S13GamePlayReward Run')).toBe('over')
  expect(classify(find('HeartBeat'))).toBeNull()
  expect(isAnimation(find('KYZ_Card_Tool_Surgery'))).toBe(true)
})

it('page-stack dumps are not triggers', () => {
  expect(classify(find('PageStack@') + ' PageName = S13GamePlayMain, PageType')).toBeNull()
})

it('reads log timestamps', () => {
  expect(logTime('[2026.10.17-14.24.11:563][ 1]TLLua: x')).toBe(Date.UTC(2026, 9, 17, 14, 24, 11, 563))
  expect(logTime('no time')).toBeNull()
})

const DONE = "LogDataTable: Warning: UDataTable::FindRow : 'Play_UI_S13_KYZ_Card_Figure_Refresh' requested row"
const MY_CLICK_SOUND = "LogDataTable: Warning: UDataTable::FindRow : 'Play_UI_S13_KYZ_Card_Selected' requested row"
const CLICK = '[Game] UIButton@ normal-click SelectBtn'

/** an instrument firing: an animation that isn't a deal */
const SURGERY = "LogDataTable: Warning: UDataTable::FindRow : 'Play_UI_S13_KYZ_Card_Tool_Surgery' requested row"

it('a board waits for its deal; with none logged, 1 s, then for animations to go quiet', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed([SURGERY], 900)
  expect(s.due(1000)).toBeNull()
  expect(s.due(1050)).toBe('board')
  expect(s.settledBy).toBe('quiet')
  expect(s.due(1100)).toBeNull()
})

it('a screen opening settles once its animations go quiet (no deal to wait for)', () => {
  const s = createSettler()
  s.feed(['[Game] S13GamePlayMain Run'], 0)
  s.feed([SURGERY], 100)
  expect(s.due(249)).toBeNull()
  expect(s.due(250)).toBe('screen')
})

// After an instrument pick or a potion that changes nothing, Oct 23: the board's line, then nothing logged for
// 0.42-0.53 s before the deal. A picture in that gap has no cards.
it('the silence before a deal does not settle a board', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed([SURGERY], 5)
  expect(s.due(500)).toBeNull()
  s.feed(['Play_UI_S13_KYZ_Card_Selected_Shuffle'], 520)
  expect(s.due(619)).toBeNull()
  expect(s.due(620)).toBe('board')
  expect(s.settledBy).toBe('dealt')
})

it('the numbers landing ends the wait early', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed([ANIM], 100)
  s.feed([DONE], 200)
  expect(s.due(199)).toBeNull()
  expect(s.due(200)).toBe('board')
})

it('the player clicking means the board has settled', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed([ANIM], 100)
  s.feed([CLICK, MY_CLICK_SOUND], 150)
  expect(s.due(150)).toBe('board')
})

it("the player's own click sounds are not animations", () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed([MY_CLICK_SOUND], 900)
  // the deal wait over, the silence since the board's line counts: the click sound didn't break it
  expect(s.due(1000)).toBe('board')
})

it('settler caps the wait', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  for (let t = 100; t < 3000; t += 100) {
    s.feed([SURGERY], t)
    expect(s.due(t)).toBeNull()
  }
  expect(s.due(3000)).toBe('board')
})

it('over cancels a pending snap, and the next game screen clears it', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed(['ProtoId = 5621'], 100)
  expect(s.over).toBe(true)
  expect(s.due(5000)).toBeNull()
  s.feed(['ProtoId = 5619'], 6000)
  expect(s.due(9000)).toBeNull()
  s.feed(['[Game] S13GamePlayMain Run'], 10000)
  expect(s.over).toBe(false)
  expect(s.due(10700)).toBe('screen')
})

it('refreshes are counted and reset by a new game', () => {
  const s = createSettler()
  s.feed(["requested row 'S13GamePlayMain_C_RefreshBtn' not in", "requested row 'S13GamePlayMain_C_RefreshBtn' not in"], 0)
  expect(s.refreshes).toBe(2)
  s.feed(['[Game] S13GamePlayMain Run'], 10)
  expect(s.refreshes).toBe(0)
})

it('replaying a real game snaps once per board update', () => {
  const s = createSettler()
  const snaps: string[] = []
  let clock = logTime(fixture[0])!
  for (const line of fixture) {
    const t = logTime(line) ?? clock
    for (; clock < t; clock += 50) {
      const d = s.due(clock)
      if (d) snaps.push(d)
    }
    s.feed([line], t)
  }
  for (let end = clock + 5000; clock < end; clock += 50) {
    const d = s.due(clock)
    if (d) snaps.push(d)
  }
  const boards = fixture.filter(l => l.includes('ProtoId = 5619')).length
  expect(boards).toBe(19)
  expect(snaps.filter(k => k === 'board')).toHaveLength(boards)
  expect(snaps.filter(k => k === 'screen')).toHaveLength(1)
  expect(s.refreshes).toBe(fixture.filter(l => l.includes("'S13GamePlayMain_C_RefreshBtn'")).length)
  expect(s.over).toBe(true)
})

it('remembers why the last snap was due', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  // numbers keep changing: only the time limit ends the wait, at 6 s
  for (let t = 100; t < 6000; t += 100) s.feed(['Play_UI_S13_KYZ_Card_Figure_Add_Small'], t)
  expect(s.due(5900)).toBeNull()
  expect(s.due(6000)).toBe('board')
  expect(s.settledBy).toBe('max')
})

// A potion's numbers, as the game logged them (Oct 22-23, at x4): additions about 220 ms apart, then ~580 ms
// of silence before the numbers land (Figure_Refresh). 0.4 s of silence came before every one of 32 landings.
const ADD = 'Play_UI_S13_KYZ_Card_Figure_Add_Small'
const LANDED = 'Play_UI_S13_KYZ_Card_Figure_Refresh'

it('a board whose numbers change waits for them to land, past the silence before they do', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed(['Play_UI_S13_KYZ_Card_Monster_change', ADD], 60)
  s.feed([ADD], 280)
  s.feed(['Play_UI_S13_KYZ_Card_Figure_Add_Large', 'Play_UI_S13_KYZ_Card_Selected_Shuffle'], 713)
  // 0.4 s of silence: not enough while numbers are changing
  expect(s.due(1150)).toBeNull()
  s.feed([LANDED, LANDED], 1293)
  expect(s.due(1293)).toBe('board')
  expect(s.settledBy).toBe('done')
})

it('numbers that change without a landing line: 0.8 s of silence', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed([ADD], 60)
  s.feed(['Play_UI_S13_KYZ_Card_Figure_Add_Large'], 550)
  expect(s.due(1300)).toBeNull()
  expect(s.due(1350)).toBe('board')
  expect(s.settledBy).toBe('quiet')
})

it('a big potion is waited for past 3 s (numbers landed up to 4.8 s after the board)', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  for (let t = 60; t < 4600; t += 220) s.feed([ADD], t)
  expect(s.due(4600)).toBeNull()
  s.feed([LANDED], 4777)
  expect(s.due(4950)).toBe('board')
  expect(s.settledBy).toBe('done')
})

// The new hand being dealt (Selected_Shuffle) was the last animation of all 42 plain deals in the logs of
// Oct 22-23, and the next click came 0.47 s after it at the soonest: a deal with no numbers changing is
// settled 0.1 s after it ('dealt'), and the picture still waits for a still screen.
it('a board with no numbers changing settles 0.1 s after the new hand is dealt', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed(['Play_UI_S13_KYZ_Card_Tool_Surgery'], 6)
  s.feed(['Play_UI_S13_KYZ_Card_Selected_Shuffle'], 537)
  expect(s.due(600)).toBeNull()
  expect(s.due(650)).toBe('board')
  expect(s.settledBy).toBe('dealt')
})

it('anything animating after the deal falls back to the silence', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed(['Play_UI_S13_KYZ_Card_Selected_Shuffle'], 500)
  s.feed(['Play_UI_S13_KYZ_Card_Tool_Surgery'], 550)
  expect(s.due(699)).toBeNull()
  expect(s.due(700)).toBe('board')
  expect(s.settledBy).toBe('quiet')
})

it('a deal while numbers change still waits for them to land', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed([ADD], 60)
  // as in potion rounds: the deal ~0.58 s before the numbers land
  s.feed(['Play_UI_S13_KYZ_Card_Selected_Shuffle'], 120)
  expect(s.due(450)).toBeNull()
  s.feed([LANDED], 700)
  expect(s.due(850)).toBe('board')
  expect(s.settledBy).toBe('done')
})

it('closing the Vorax screen is over but not finished; the reward screen finishes the run', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed(['[Game] S13GamePlayMain Destory'], 100)
  expect(s.over).toBe(true)
  expect(s.finished).toBe(false)
  expect(s.due(5000)).toBeNull()
  s.feed(['[Game] S13GamePlayMain Run'], 6000)
  expect(s.over).toBe(false)
  s.feed(['[Game] S13GamePlayMain Hide', '[Game] S13GamePlayReward Run'], 7000)
  expect(s.over).toBe(true)
  expect(s.finished).toBe(true)
  // the next run clears both
  s.feed(['[Game] S13GamePlayMain Run'], 9000)
  expect(s.over).toBe(false)
  expect(s.finished).toBe(false)
})

// Protocol rounds, Oct 23: the deal and the numbers landing logged at the same moment, the cards still flying in
it('numbers landing with the deal are no reason for an instant picture: it waits for a still screen', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed(['Play_UI_S13_KYZ_Card_Selected_Shuffle', LANDED, LANDED, 'Play_UI_S13_KYZ_Card_Figure_Add_Large'], 443)
  expect(s.due(443)).toBe('board')
  expect(s.settledBy).toBe('dealt')
})

it('reads the interface scale the game logs as a page opens, as the reader\u2019s scale', () => {
  const line = (v: string) => `[2026.10.23-22.24.11:769][  0]TLLua: Display: [Game] PageView@PageViewSetUIScale PageId = 69917_FightCtrl, PageScale = ${v} ${Number(v).toFixed(3)} ${v}`
  expect(uiScaleOf(line('0.66887495368719'))).toBeCloseTo(1, 6)
  expect(uiScaleOf(line('0.64'))).toBeCloseTo(0.957, 3)
  expect(uiScaleOf(line('0.84115232944489'))).toBeCloseTo(1.258, 3)
  expect(uiScaleOf(line('1.0'))).toBeCloseTo(1.495, 3)
  expect(uiScaleOf('[Game] S13GamePlayMain Run')).toBeNull()
})
