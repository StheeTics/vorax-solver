import { readdirSync, readFileSync } from 'node:fs'

// The live data, the daily check and the smarter player run on the PC, in scripts/nightly.sh (since 2026-10-22)
const nightly = readFileSync('scripts/nightly.sh', 'utf8')
const job = (name: string) => nightly.slice(nightly.indexOf(`job_${name}() {`), nightly.indexOf('\n}\n', nightly.indexOf(`job_${name}() {`)))

it('the live-data job pulls, applies the odds, tests, then commits', () => {
  const t = job('live')
  const order = ['scripts/live/pull.ts', 'scripts/live/summary.ts', 'scripts/live/weights.ts', 'npm test', 'push -F']
  let at = -1
  for (const s of order) {
    const i = t.indexOf(s)
    expect(i, s).toBeGreaterThan(at)
    at = i
  }
})

it('it does nothing harmful without the collector’s address and token', () => {
  expect(job('live')).toMatch(/\[ -n "\$\{LIVE_DATA_URL:-\}" \] && \[ -n "\$\{LIVE_DATA_TOKEN:-\}" \] \|\| \{[^}]*return 1/)
})

it('applies the odds changes the data supports (the guards are in propose.ts); a push that changes src/ redeploys', () => {
  const t = job('live')
  expect(t).toContain('vn scripts/live/weights.ts | tee')
  expect(t).not.toContain('scripts/live/weights.ts --propose')
  expect(t).toContain('git add data/live src/data/liveWeights.ts src/solver/scan/learnedIcons.json')
  // pushed from the PC, so deploy.yml starts by itself; the data alone doesn't redeploy
  const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8')
  expect(deploy).toContain("paths-ignore: ['data/**'")
  expect(deploy).not.toMatch(/'src\/\*\*'/)
})

it('pulls the named panel icons too', () => {
  expect(readFileSync('scripts/live/pull.ts', 'utf8')).toContain('pullIcons(')
})

it('pull leaves the odds file alone when no new boards came in, so a quiet run commits nothing', () => {
  const t = readFileSync('scripts/live/pull.ts', 'utf8')
  expect(t).toMatch(/if \(added > 0 \|\| !existsSync/)
})

it('teaches the reader the icons players named, before the tests', () => {
  const t = job('live')
  expect(t.indexOf('scripts/live/learnIcons.ts')).toBeGreaterThan(t.indexOf('scripts/live/pull.ts'))
  expect(t.indexOf('scripts/live/learnIcons.ts')).toBeLessThan(t.indexOf('npm test'))
})

it('every push rebases onto main first: something else may have pushed meanwhile', () => {
  const push = nightly.slice(nightly.indexOf('push() {'), nightly.indexOf('\n}\n', nightly.indexOf('push() {')))
  expect(push.indexOf('git pull -q --rebase')).toBeGreaterThan(push.indexOf('git commit'))
  expect(push.indexOf('git pull -q --rebase')).toBeLessThan(push.indexOf('git push'))
})

it('runs at the lowest priority, 16 at once overnight and 8 with --day, and commits only as tidewarden', () => {
  expect(nightly).toMatch(/^JOBS=16$/m)
  expect(nightly).toContain('--day) JOBS=8')
  expect(nightly).toMatch(/xargs -d '\\n' -n1 -P "\$JOBS"/)
  for (const line of nightly.split('\n').filter(l => /npx vite-node/.test(l) && !/^\s*#/.test(l))) expect(line, line).toContain('nice -n 19')
  expect(nightly).toContain('*tidewarden*) ;;')
})

it('the moved jobs are gone from GitHub Actions, and the collector no longer starts them', () => {
  expect(readdirSync('.github/workflows').sort()).toEqual(['dashboard.yml', 'deploy.yml', 'desktop.yml', 'issue-fixer.yml'])
})

it('every 2 hours on GitHub, the dashboard gets its numbers from the new boards, and nothing is committed', () => {
  const w = readFileSync('.github/workflows/dashboard.yml', 'utf8')
  expect(w).toContain("cron: '17 */2 * * *'")
  const runs = w.split('\n').filter(l => /^\s*(- )?run: /.test(l)).map(l => l.replace(/^\s*(- )?run: /, ''))
  expect(runs).toEqual(['npm ci --no-audit --no-fund', 'npx vite-node scripts/live/pull.ts', 'npx vite-node scripts/live/summary.ts'])
  expect(w).toContain('contents: read')
  expect(w).not.toMatch(/git (commit|push)|weights\.ts|npm test/)
})
