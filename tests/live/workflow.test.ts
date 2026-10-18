import { readFileSync } from 'node:fs'

it('the live-data workflow pulls, updates weights, tests, then commits, every 6 hours', () => {
  const t = readFileSync('.github/workflows/live-data.yml', 'utf8')
  const order = ['cron:', 'contents: write', 'scripts/live/pull.ts', 'scripts/live/weights.ts', 'npm test', 'git commit']
  let at = -1
  for (const s of order) {
    const i = t.indexOf(s)
    expect(i, s).toBeGreaterThan(at)
    at = i
  }
})

it('it does nothing harmful before the collector exists', () => {
  const t = readFileSync('.github/workflows/live-data.yml', 'utf8')
  expect(t).toContain('LIVE_DATA_URL')
  expect(t).toMatch(/if: \$\{\{ vars\.LIVE_DATA_URL != '' \}\}/)
})
