import { readFileSync } from 'node:fs'

it('the live-data workflow pulls, proposes weights, tests, then commits, every 15 minutes', () => {
  const t = readFileSync('.github/workflows/live-data.yml', 'utf8')
  expect(t).toContain("cron: '*/15 * * * *'")
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

it('only proposes weight changes, and never deploys: the data is reviewed before the odds change', () => {
  const t = readFileSync('.github/workflows/live-data.yml', 'utf8')
  expect(t).toContain('scripts/live/weights.ts --propose')
  expect(t).not.toContain('git add data/live src/data/liveWeights.ts')
  expect(t).not.toContain('gh workflow run deploy.yml')
})

it('pulls the named panel icons too', () => {
  expect(readFileSync('scripts/live/pull.ts', 'utf8')).toContain('pullIcons(')
})

it('pull leaves the odds file alone when no new boards came in, so a quiet run commits nothing', () => {
  const t = readFileSync('scripts/live/pull.ts', 'utf8')
  expect(t).toMatch(/if \(added > 0 \|\| !existsSync/)
})
