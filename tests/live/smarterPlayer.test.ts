import { readFileSync } from 'node:fs'
import { decide, type Game } from '../../scripts/sim/gate'

const games = (scores: number[], from = 0): Game[] => scores.map((score, i) => ({ seed: from + i, score }))
const reach = 950_000, miss = 600_000

describe('the gate a new board value must pass to be proposed', () => {
  it('passes a challenger that gets clearly more games to 950,000 without lowering the average', () => {
    const champion = games([...Array(40).fill(miss), ...Array(60).fill(reach)])
    const challenger = games([...Array(30).fill(miss), ...Array(70).fill(reach)])
    const d = decide(champion, challenger)
    expect(d.pass).toBe(true)
    expect(d).toMatchObject({ games: 100, champion: { reached: 60 }, challenger: { reached: 70 }, gained: 10, lost: 0 })
  })
  it('fails one that reaches 950,000 as often', () => {
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

describe('the smarter-player loop (scripts/sim/smarter.sh, run on the owner\'s PC)', () => {
  const t = readFileSync('scripts/sim/smarter.sh', 'utf8')
  it('trains with the board value as shipped, fits, then gates the challenger against it', () => {
    expect(t).toContain('VALUE_MODEL=src/data/boardValue.json SEED0')
    const order = ['scripts/sim/valueData.ts', 'scripts/sim/valueFit.ts', 'VALUE_MODEL=$out/challenger.json', 'scripts/sim/gate.ts', 'gh pr create']
    let at = -1
    for (const s of order) { const i = t.indexOf(s, at + 1); expect(i, s).toBeGreaterThan(at); at = i }
  })
  it('works on a copy of origin/main, at the lowest priority', () => {
    expect(t).toContain('git worktree add -q --detach "$work" origin/main')
    expect(t).toContain('nice -n 19')
  })
  it('only proposes: a smarter-player/ branch and a pull request, never main', () => {
    expect(t).toContain('refs/heads/smarter-player/')
    expect(t).not.toMatch(/git push[^\n]*\bmain\b/)
  })
})
