import { readFileSync } from 'node:fs'

it('the live-data workflow pulls, applies the odds, tests, then commits, every hour', () => {
  const t = readFileSync('.github/workflows/live-data.yml', 'utf8')
  expect(t).toContain("cron: '17 * * * *'")
  const order = ['cron:', 'contents: write', 'scripts/live/pull.ts', 'scripts/live/summary.ts', 'scripts/live/weights.ts', 'npm test', 'git commit']
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

it('applies the odds changes the data supports (the guards are in propose.ts), and new odds go out with a redeploy', () => {
  const t = readFileSync('.github/workflows/live-data.yml', 'utf8')
  expect(t).toContain('npx vite-node scripts/live/weights.ts | tee weights.txt')
  expect(t).not.toContain('scripts/live/weights.ts --propose')
  expect(t).toContain('git add data/live src/data/liveWeights.ts')
  // a push made with the workflow's token starts no other workflow, so the redeploy is started here
  expect(t).toContain('if [ -n "$odds" ] || [ -n "$icons" ]; then gh workflow run deploy.yml; fi')
})

it('pulls the named panel icons too', () => {
  expect(readFileSync('scripts/live/pull.ts', 'utf8')).toContain('pullIcons(')
})

it('pull leaves the odds file alone when no new boards came in, so a quiet run commits nothing', () => {
  const t = readFileSync('scripts/live/pull.ts', 'utf8')
  expect(t).toMatch(/if \(added > 0 \|\| !existsSync/)
})

it('teaches the reader the icons players named, every hour, and redeploys when that changed it', () => {
  const t = readFileSync('.github/workflows/live-data.yml', 'utf8')
  expect(t.indexOf('scripts/live/learnIcons.ts')).toBeGreaterThan(t.indexOf('scripts/live/pull.ts'))
  expect(t.indexOf('scripts/live/learnIcons.ts')).toBeLessThan(t.indexOf('npm test'))
  expect(t).toContain('src/solver/scan/learnedIcons.json')
  expect(t).toContain('gh workflow run deploy.yml')
})

it('every workflow that commits to main rebases onto it first: another job may have pushed meanwhile', () => {
  for (const f of ['live-data', 'daily-check']) {
    const t = readFileSync(`.github/workflows/${f}.yml`, 'utf8')
    expect(t.indexOf('git pull --rebase'), f).toBeGreaterThan(t.indexOf('git commit'))
    expect(t.indexOf('git pull --rebase'), f).toBeLessThan(t.indexOf('git push'))
  }
})
