// Pulls the training data players' Solvers filed (worker/src/training.ts): every open "Training Data: …" issue's
// screenshots, from the training-data branch into training/td/, with the label each carries. Labels whose hand is
// all named are written to scripts/scan/training-pending.json for checking against their pictures; with --add they
// go into scripts/scan/cards.json, ready for scripts/scan/build.ts. Unrecognised cards are listed to be named by hand.
// Usage: GH_TOKEN=$(gh auth token --user tidewarden) npx vite-node scripts/scan/pullTraining.ts [--add]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { ranked } from '../../src/solver/scan/titles'
import type { HandPhase } from '../../src/solver/scan/data'

const REPO = 'tidewarden/vorax-solver'
const BRANCH = 'training-data'
const token = process.env.GH_TOKEN
if (!token) throw new Error('GH_TOKEN is needed: GH_TOKEN=$(gh auth token --user tidewarden)')
const add = process.argv.includes('--add')

const gh = async (path: string, accept = 'application/vnd.github+json') => {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, { headers: { authorization: `Bearer ${token}`, accept, 'x-github-api-version': '2022-11-28' } })
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res
}

interface Label { file: string; phase: HandPhase; slot: number; hand: string[]; name?: string; text?: string; why: string; round?: number }
const labels = (body: string): Label[] => [...body.matchAll(/```json\n([\s\S]*?)\n```/g)].flatMap(m => {
  try {
    return [JSON.parse(m[1]) as Label]
  } catch {
    return []
  }
})

const issues = ((await (await gh('/issues?state=open&per_page=100')).json()) as { number: number; title: string; body: string; comments: number }[])
  .filter(i => i.title.startsWith('Training Data:'))
const known = (phase: HandPhase, n: string) => ranked(phase, 'x').some(([k]) => k === n)
const pending: Record<string, { phase: HandPhase; hand: string[] }> = {}
const toName: string[] = []
mkdirSync('training/td', { recursive: true })

for (const issue of issues) {
  const comments = issue.comments ? ((await (await gh(`/issues/${issue.number}/comments?per_page=100`)).json()) as { body: string }[]) : []
  for (const l of [issue.body, ...comments.map(c => c.body)].flatMap(labels)) {
    const local = `td/${l.file.split('/').pop()}`
    if (!existsSync(`training/${local}`)) writeFileSync(`training/${local}`, Buffer.from(await (await gh(`/contents/${l.file}?ref=${BRANCH}`, 'application/vnd.github.raw')).arrayBuffer()))
    if (l.hand.every(n => known(l.phase, n))) pending[local] = { phase: l.phase, hand: l.hand }
    else toName.push(`#${issue.number} ${local}: ${l.phase}, slot ${l.slot + 1} read as "${l.name ?? l.text}", hand ${JSON.stringify(l.hand)}`)
  }
}

console.log(`${issues.length} training issues, ${Object.keys(pending).length} screenshots labelled, ${toName.length} to name by hand`)
for (const [file, l] of Object.entries(pending)) console.log(`  ${file}: ${l.phase} ${l.hand.join(' | ')}`)
for (const t of toName) console.log(`  to name: ${t}`)
writeFileSync('scripts/scan/training-pending.json', JSON.stringify(pending, null, 1) + '\n')
if (add) {
  const cards = JSON.parse(readFileSync('scripts/scan/cards.json', 'utf8')) as Record<string, unknown>
  writeFileSync('scripts/scan/cards.json', JSON.stringify({ ...cards, ...pending }, null, 1) + '\n')
  console.log('added to scripts/scan/cards.json: check them against their pictures, then npx vite-node scripts/scan/build.ts')
}
