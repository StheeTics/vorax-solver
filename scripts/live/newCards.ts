// The cards the Solver couldn't name (data/live/cards.jsonl, pulled by pull.ts), by name, without the ones it
// knows now: written to data/live/new-cards.json. With --issues, opens a GitHub issue for each new card that has
// none yet (open or closed), with what its title read as and its picture, so it can be added for everyone.
// Usage: npx vite-node scripts/live/newCards.ts [--issues]   (--issues needs GH_TOKEN)
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { names } from '../../src/strategy/advisor'
import { nameFit } from '../../src/solver/scan/titles'
import { slug } from './collect'

const REPO = 'tidewarden/tli-vorax-simulator'
const FILE = 'data/live/cards.jsonl'
/** A name read this close to a known card's, as a share of that name read perfectly, is that card misread. Misreads
 *  measure 0.83 to 0.90; a card that only shares words with a known one (Spinal Solution - Pest beside its Agito
 *  card, a new Holy Water rite) 0.61 or less. */
const KNOWN = 0.75

export interface NewCard { name: string; phase: string; seen: number; first: string; last: string; text: string; picture: string | null }

export function newCards(rows: { received: string; phase: string; name: string; text: string }[]): NewCard[] {
  const known = names()
  const pool = (phase: string) => (phase === 'instrument' ? known.instruments : known.potions)
  const byName = new Map<string, NewCard>()
  for (const r of rows) {
    if (!r.name || pool(r.phase).some(n => nameFit(n, r.text).q >= KNOWN * nameFit(n, n).q)) continue
    const key = slug(r.phase, r.name)
    const c = byName.get(key) ?? { name: r.name, phase: r.phase, seen: 0, first: r.received, last: r.received, text: r.text, picture: null }
    c.seen++
    c.last = r.received
    // the fullest reading of it
    if (r.text.length > c.text.length) c.text = r.text
    const pic = `data/live/new-cards/${key}.jpg`
    c.picture = existsSync(pic) ? pic : null
    byName.set(key, c)
  }
  return [...byName.values()].sort((a, b) => b.seen - a.seen)
}

const title = (c: NewCard) => `New card seen: ${c.name}`

if (!process.env.VITEST) {
  const rows = existsSync(FILE) ? readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []
  const list = newCards(rows)
  writeFileSync('data/live/new-cards.json', JSON.stringify(list, null, 1) + '\n')
  console.log(list.length ? `${list.length} cards the Solver doesn't know: ${list.map(c => `${c.name} (${c.seen})`).join(', ')}` : 'No new cards')
  if (process.argv.includes('--issues')) {
    const gh = (...a: string[]) => execFileSync('gh', a, { encoding: 'utf8' })
    for (const c of list) {
      const found = JSON.parse(gh('issue', 'list', '-R', REPO, '--state', 'all', '--search', `"${title(c)}" in:title`, '--json', 'title')) as { title: string }[]
      if (found.some(i => i.title === title(c))) continue
      const body = [
        `The Solver saw a ${c.phase === 'instrument' ? 'Surgical Instrument' : 'potion'} card it doesn't know, ${c.seen} time${c.seen === 1 ? '' : 's'} so far (first ${c.first.slice(0, 10)}). Until it's added, the Solver leaves it out of its advice and tells the player so.`,
        '',
        '**Its card, as read:**',
        '```',
        c.text,
        '```',
        ...(c.picture ? ['', `![${c.name}](https://raw.githubusercontent.com/${REPO}/main/${c.picture})`] : []),
        '',
        'To add it: its exact name, its effect text (hover the card in the game: the raised card shows it in full) and its rarity. An Ultimate whose effect the simulator can\'t play out goes in src/data/xenopanacea.ts, to be always advised.',
      ].join('\n')
      console.log(gh('issue', 'create', '-R', REPO, '--title', title(c), '--body', body).trim())
    }
  }
}
