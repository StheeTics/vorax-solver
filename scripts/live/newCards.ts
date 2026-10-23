// The cards the Solver couldn't name (data/live/cards.jsonl, pulled by pull.ts), by name, without the ones it
// knows now: written to data/live/new-cards.json, to be checked by hand and added.
// Usage: npx vite-node scripts/live/newCards.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { names } from '../../src/strategy/advisor'
import { nameFit } from '../../src/solver/scan/titles'
import { slug } from './collect'

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

if (!process.env.VITEST) {
  const rows = existsSync(FILE) ? readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []
  const list = newCards(rows)
  writeFileSync('data/live/new-cards.json', JSON.stringify(list, null, 1) + '\n')
  console.log(list.length ? `${list.length} cards the Solver doesn't know: ${list.map(c => `${c.name} (${c.seen})`).join(', ')}` : 'No new cards')
}
