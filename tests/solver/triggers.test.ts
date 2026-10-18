import { readFileSync } from 'node:fs'
import { classify, createSettler, isAnimation, logTime } from '@/solver/live/triggers'

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

it('settler waits for animations to go quiet', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed([ANIM], 500)
  expect(s.due(800)).toBeNull()
  expect(s.due(900)).toBe('board')
  expect(s.due(1000)).toBeNull()
})

it('the numbers landing ends the wait early', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  s.feed([ANIM], 100)
  s.feed([DONE], 200)
  expect(s.due(300)).toBeNull()
  expect(s.due(350)).toBe('board')
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
  s.feed([MY_CLICK_SOUND], 300)
  expect(s.due(400)).toBe('board')
})

it('settler caps the wait', () => {
  const s = createSettler()
  s.feed(['ProtoId = 5619'], 0)
  for (let t = 100; t < 3000; t += 100) {
    s.feed([ANIM], t)
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
