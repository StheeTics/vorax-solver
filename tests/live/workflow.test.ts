import { readFileSync } from 'node:fs'

it('the live-data workflow pulls, applies the odds, tests, then commits, every hour', () => {
  const t = readFileSync('.github/workflows/live-data.yml', 'utf8')
  expect(t).toContain("cron: '17 * * * *'")
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

it('applies the odds changes the data supports (the guards are in propose.ts), and new odds go out through the strengths workflow', () => {
  const t = readFileSync('.github/workflows/live-data.yml', 'utf8')
  expect(t).toContain('npx vite-node scripts/live/weights.ts | tee weights.txt')
  expect(t).not.toContain('scripts/live/weights.ts --propose')
  expect(t).toContain('git add data/live src/data/liveWeights.ts')
  // the strengths are re-measured under the new odds before the site redeploys
  expect(t).toContain('gh workflow run strengths.yml')
  expect(t).not.toContain('gh workflow run deploy.yml')
})

it('pulls the named panel icons too', () => {
  expect(readFileSync('scripts/live/pull.ts', 'utf8')).toContain('pullIcons(')
})

it('pull leaves the odds file alone when no new boards came in, so a quiet run commits nothing', () => {
  const t = readFileSync('scripts/live/pull.ts', 'utf8')
  expect(t).toMatch(/if \(added > 0 \|\| !existsSync/)
})
