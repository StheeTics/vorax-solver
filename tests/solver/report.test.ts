import { readFileSync } from 'node:fs'
import { buildReport, issueLink, reportTitle } from '@/solver/report/report'
import { emptyState, type Reading } from '@/solver/types'

const ctx = { build: 'abc1234', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', source: 'live' as const, corrections: {} }
const reading: Reading = {
  state: { ...emptyState(), round: 9, hand: ['Xeno-Hormone'] },
  fields: { round: { sure: true }, 'hand1': { sure: false, guess: 'Green Bile Solution', score: 0.81, second: 0.79 } },
  problems: [{ kind: 'unknownArt', field: 'hand1', crop: { x: 0, y: 0, w: 10, h: 10 } }, { kind: 'unreadable', field: 'tank3.activity' }],
  frame: { width: 2560, height: 1440, trigger: 'board' },
}

it('report lists every problem', () => {
  const r = buildReport(reading, ctx)
  expect(r.startsWith('### Solver reading report')).toBe(true)
  expect(r).toContain('card 2 not recognised; tank 4 Activity unreadable')
  expect(r).toContain('Solver: vabc1234 · Chrome 141 · Windows')
  expect(r).toContain('Frame: 2560×1440, source: live (trigger: board)')
  expect(r).toContain('Round: 9/13 (sure)')
  expect(r).toContain('"hand1": "Green Bile Solution (score 0.81 vs 0.79)"')
})

it('report never contains log lines', () => {
  const r = buildReport(reading, ctx)
  expect(r).not.toMatch(/TLLua|ProtoId/)
})

it('corrections are listed only when there are some', () => {
  expect(buildReport(reading, ctx)).not.toContain('Your corrections')
  expect(buildReport(reading, { ...ctx, corrections: { 'tank3.activity': '27540' } })).toContain('Your corrections: tank3.activity 27540')
})

it('the title names the first problem', () => {
  expect(reportTitle(reading)).toBe('Solver: card 2 not recognised')
  expect(reportTitle({ ...reading, problems: [{ kind: 'notFound' }] })).toBe('Solver: screen not found')
})

it('issueLink prefills short reports', () => {
  const { url, prefilled } = issueLink('Solver: x', 'short report')
  expect(prefilled).toBe(true)
  const u = new URL(url)
  expect(u.searchParams.get('template')).toBe('solver-reading.yml')
  expect(u.searchParams.get('report')).toBe('short report')
})

it('issueLink falls back past 7500 characters', () => {
  const { url, prefilled } = issueLink('Solver: x', 'y'.repeat(10_000))
  expect(prefilled).toBe(false)
  expect(new URL(url).searchParams.has('report')).toBe(false)
  expect(url.length).toBeLessThanOrEqual(7500)
})

it('the issue template has the report fields', () => {
  const t = readFileSync('.github/ISSUE_TEMPLATE/solver-reading.yml', 'utf8')
  for (const line of ['id: report', 'id: actual', 'id: screenshots', 'labels: [solver-reading]']) expect(t).toContain(line)
})
