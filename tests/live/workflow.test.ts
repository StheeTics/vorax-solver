import { readFileSync } from 'node:fs'

it('the live-data workflow pulls, updates weights, tests, then commits, every 15 minutes', () => {
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

it('redeploys the site itself when the weights changed (a push by the workflow starts no other workflow)', () => {
  const t = readFileSync('.github/workflows/live-data.yml', 'utf8')
  expect(t).toContain('actions: write')
  expect(t).toMatch(/if: \$\{\{ steps\.commit\.outputs\.weights == 'changed' \}\}[\s\S]*gh workflow run deploy\.yml/)
})

it('pull leaves the odds file alone when no new boards came in, so a quiet run commits nothing', () => {
  const t = readFileSync('scripts/live/pull.ts', 'utf8')
  expect(t).toMatch(/if \(added > 0 \|\| !existsSync/)
})
