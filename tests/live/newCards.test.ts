import { newCards } from '../../scripts/live/newCards'
import { cardName, slug } from '../../scripts/live/collect'

const row = (name: string, text = name, phase = 'potion') => ({ received: '2026-10-21T03:00:00Z', phase, name, text })

describe('the cards the Solver couldn’t name', () => {
  it('are listed by name, most seen first, with their fullest reading', () => {
    const list = newCards([row('Ritual Holy Water: Atonement'), row('Fresh Card'), row('Fresh Card', 'Fresh Card\nIts flavour text'), row('Fresh Card')])
    expect(list.map(c => [c.name, c.seen])).toEqual([['Fresh Card', 3], ['Ritual Holy Water: Atonement', 1]])
    expect(list[0].text).toBe('Fresh Card\nIts flavour text')
  })
  it('a card that only shares words with a known one is still new', () => {
    expect(newCards([row('Spinal Solution - Pest'), row('Ritual Holy Water: Penance')]).map(c => c.name)).toEqual(['Spinal Solution - Pest', 'Ritual Holy Water: Penance'])
  })
  it('leave out the ones it knows now: a known card misread, or one added since', () => {
    expect(newCards([row('Eggshell Powdr', 'Eggshell Powdr\n+25 Quantity'), row('First Rite Holy Water: Confession'), row('Sinew Garote', 'Sinew Garote', 'instrument')])).toEqual([])
  })
  it('take their name from the title’s first line, and a file name from it', () => {
    expect(cardName('“First Rite Holy Water: Confession |\nThe throat')).toBe('First Rite Holy Water: Confession')
    expect(slug('potion', 'First Rite Holy Water: Confession')).toBe('potion-first-rite-holy-water-confession')
    expect(slug('potion', '')).toBe('potion-unnamed')
  })
})
