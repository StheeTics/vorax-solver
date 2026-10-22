import { readFileSync } from 'node:fs'
import { decide, type Game } from '../../scripts/sim/gate'

const games = (scores: number[], from = 0): Game[] => scores.map((score, i) => ({ seed: from + i, score }))
const reach = 840_000, miss = 600_000

describe('the gate a new board value must pass to be proposed', () => {
  it('passes a challenger that gets clearly more games to 840,000 without lowering the average', () => {
    const champion = games([...Array(40).fill(miss), ...Array(60).fill(reach)])
    const challenger = games([...Array(30).fill(miss), ...Array(70).fill(reach)])
    const d = decide(champion, challenger)
    expect(d.pass).toBe(true)
    expect(d).toMatchObject({ games: 100, champion: { reached: 60 }, challenger: { reached: 70 }, gained: 10, lost: 0 })
  })
  it('fails one that reaches 840,000 as often', () => {
    const both = games([...Array(40).fill(miss), ...Array(60).fill(reach)])
    expect(decide(both, both).pass).toBe(false)
  })
  it('fails one that gains a few games but lowers the average', () => {
    const champion = games([...Array(40).fill(800_000), ...Array(60).fill(reach)])
    const challenger = games([...Array(34).fill(200_000), ...Array(66).fill(reach)])
    expect(decide(champion, challenger).pass).toBe(false)
  })
  it('compares only the games both played', () => {
    expect(decide(games([reach, miss]), games([reach], 0)).games).toBe(1)
  })
})

describe('the smarter-player workflow', () => {
  const t = readFileSync('.github/workflows/smarter-player.yml', 'utf8')
  it('runs nightly, and only when the odds changed after the board value was trained (or by hand)', () => {
    expect(t).toMatch(/cron: '\d+ \d+ \* \* \*'/)
    expect(t).toContain('workflow_dispatch')
    expect(t).toContain('src/data/liveWeights.ts')
    expect(t).toContain('src/data/boardValue.json')
  })
  it('trains with the board value as shipped, fits, then gates the challenger against it', () => {
    expect(t).toContain('VALUE_MODEL=src/data/boardValue.json SEED0')
    const order = ['scripts/sim/valueData.ts', 'scripts/sim/valueFit.ts', 'VALUE_MODEL=challenger.json', 'scripts/sim/gate.ts', 'gh pr create']
    let at = -1
    for (const s of order) { const i = t.indexOf(s, at + 1); expect(i, s).toBeGreaterThan(at); at = i }
  })
  it('only record and publish can write: record adds to the history file alone, publish only proposes (a smarter-player/ branch and a pull request)', () => {
    expect(t).toMatch(/^permissions:\s*\{\}/m)
    expect(t.match(/contents: write/g)).toHaveLength(2)
    expect(t).toContain('git add data/sim/smarter-history.jsonl')
    expect(t).toContain('refs/heads/smarter-player/')
    expect(t).not.toMatch(/git push[^\n]*\bmain\b/)
  })
})

describe('the smarter player\'s history (scripts/sim/smarterHistory.ts)', async () => {
  const { summary } = await import('../../scripts/sim/smarterHistory')
  it('keeps the 240 fixed games apart from the new ones, so runs compare with each other', () => {
    const fixed = games([reach, miss], 1_000_000), fresh = games([reach, reach], 2_000_000)
    const s = summary([...fixed, ...fresh], [...games([reach, reach], 1_000_000), ...fresh])
    expect(s.all).toMatchObject({ games: 4, shipped: { reached: 3 }, challenger: { reached: 4 } })
    expect(s.fixed).toMatchObject({ games: 2, shipped: { reached: 1 }, challenger: { reached: 2 }, gained: 1, lost: 0 })
  })
})
