import { nameFit, readTitles, wholeName, type PictureRead } from '@/solver/scan/titles'
import { emptyState, type Reading } from '@/solver/types'

describe('nameFit', () => {
  it('prefers the longest name the text really shows', () => {
    const text = 'Targetcd Xeno-\nHormone\nSelect 1 group(s) of'
    expect(nameFit('Targeted Xeno-Hormone', text).q).toBeGreaterThan(nameFit('Xeno-Hormone', text).q + 3)
  })
  it('tells near-twins apart by the word that differs', () => {
    const text = 'Anesthetic Tincture\nne\nAemberon\nSelect 1 group(s) of'
    expect(nameFit('Anesthetic Tincture - Aemberon', text).q).toBeGreaterThan(nameFit('Anesthetic Tincture - Agito', text).q + 3)
  })
  it('accepts a title whose end the next card covers', () => {
    expect(nameFit('Viscous Bile Solution', 'Viscous Bile Solutio\nSelect 1 group(s) o').q).toBeGreaterThanOrEqual(6)
  })
})

const img = { width: 3440, height: 1440, data: new Uint8ClampedArray(3440 * 1440 * 4) }
const base = (over: Partial<Reading> = {}): Reading => ({
  state: { ...emptyState(), phase: 'potion', hand: ['Xeno-Hormone'] },
  fields: { phase: { sure: true, guess: 'potion' }, hand0: { sure: false, guess: 'Spinal Solution - Agito' }, hand1: { sure: true, guess: 'Xeno-Hormone' }, hand2: { sure: false, guess: 'Eggshell Powder' } },
  problems: [{ kind: 'unknownArt', field: 'hand0', crop: { x: 0, y: 0, w: 1, h: 1 } }],
  handRanks: [[['Spinal Solution - Agito', 0.9]], [['Xeno-Hormone', 0.97]], [['Eggshell Powder', 0.93], ['Xenopurge Powder', 0.925]]],
  ...over,
})

describe('readTitles', () => {
  it('a clearly read name outranks the picture, and the card is no longer unknown', async () => {
    const texts = ['Targeted Xeno-\nHormone\nSelect 1 group(s)', '', 'Xenopurge Powder\nSelect 1 group(s) of']
    const r = await readTitles(img, base(), async () => texts.shift() ?? '')
    expect(r.state.hand).toEqual(['Targeted Xeno-Hormone', 'Xeno-Hormone', 'Xenopurge Powder'])
    expect(r.fields.hand0.sure).toBe(true)
    expect(r.problems).toEqual([])
  })
  it('when two names fit about as well, the picture picks between them', async () => {
    const texts = ['', '', 'ar Potion Kit (Small)\nContains 3 random']
    const r = await readTitles(img, base({ handRanks: [[['Spinal Solution - Agito', 0.9]], [['Xeno-Hormone', 0.97]], [['Rare Potion Kit (Small)', 0.96], ['Potion Kit (Small)', 0.94]]] }), async () => texts.shift() ?? '')
    expect(r.fields.hand2.guess).toBe('Rare Potion Kit (Small)')
    expect(r.state.hand).toEqual(['Xeno-Hormone', 'Rare Potion Kit (Small)'])
  })
  it('a covered header: the names decide which pick it is', async () => {
    const texts = ['Green Bile Solution', 'Fresh Spinal Powder', 'Slough Solution']
    const r = await readTitles(img, base({ state: { ...emptyState(), phase: 'instrument', hand: [] }, fields: { phase: { sure: false, guess: 'instrument' } }, problems: [], handRanks: [[], [], []] }), async () => texts.shift() ?? '')
    expect(r.state.phase).toBe('potion')
    expect(r.state.hand).toEqual(['Green Bile Solution', 'Fresh Spinal Powder', 'Slough Solution'])
  })
  it('leaves a reading with no hand alone', async () => {
    const r: Reading = { state: emptyState(), fields: {}, problems: [{ kind: 'notFound' }] }
    expect(await readTitles(img, r, async () => 'Slough Solution')).toBe(r)
  })
})

describe('readTitles on a reading that left the cards to their names', () => {
  const pending = (): Reading => ({ state: { ...emptyState(), phase: 'potion', hand: [] }, fields: { phase: { sure: true, guess: 'potion' } }, problems: [], handPending: true })

  it('matches every card by its picture, one at a time, while the names are read', async () => {
    const texts = ['Green Bile Solution', 'Fresh Spinal Powder', 'Slough Solution']
    const asked: number[][] = []
    const r = await readTitles(img, pending(), async () => texts.shift() ?? '', async (_phase, _size, slots) => (asked.push(slots), {}))
    expect(r.state.hand).toEqual(['Green Bile Solution', 'Fresh Spinal Powder', 'Slough Solution'])
    expect(asked).toEqual([[0], [1], [2]])
    // this blank test picture has no title strip for the first step: the names come from the second
    expect(r.timing?.steps).toEqual([2, 2, 2])
    expect(r.handPending).toBeUndefined()
  })
  it('a sure picture names a card its title can’t, without the slower reads', async () => {
    // the second card's picture is sure, so its title is never read
    const texts = ['Green Bile Solution', 'Slough Solution']
    let reads = 0
    const r = await readTitles(img, pending(), async () => (reads++, texts.shift() ?? ''), async (_phase, _size, slots): Promise<Record<number, PictureRead>> =>
      slots[0] === 1 ? { 1: { ranks: [['Fresh Spinal Powder', 0.97], ['Eggshell Powder', 0.9]], field: { sure: true, guess: 'Fresh Spinal Powder' }, unknown: false } } : {})
    expect(r.state.hand).toEqual(['Green Bile Solution', 'Fresh Spinal Powder', 'Slough Solution'])
    expect(r.timing?.steps).toEqual([2, 0, 2])
    expect(r.fields.hand1).toMatchObject({ sure: true, guess: 'Fresh Spinal Powder' })
    expect(reads).toBe(2)
  })
  it('a picture that isn’t sure leaves the card to the slower reads', async () => {
    const texts = ['Green Bile Solution', '~~', 'Slough Solution', 'Fresh Spinal Powder']
    // its picture only 0.02 ahead of the next card: not sure, so its title is read on
    const r = await readTitles(img, pending(), async () => texts.shift() ?? '', async (_phase, _size, slots): Promise<Record<number, PictureRead>> =>
      slots[0] === 1 ? { 1: { ranks: [['Fresh Spinal Powder', 0.97], ['Eggshell Powder', 0.95]], field: { sure: true, guess: 'Fresh Spinal Powder' }, unknown: false } } : {})
    expect(r.state.hand).toEqual(['Green Bile Solution', 'Fresh Spinal Powder', 'Slough Solution'])
    expect(r.timing?.steps).toEqual([2, 3, 2])
  })
  it('no picture first when the pick isn’t known: the names say which it is', async () => {
    const texts = ['Green Bile Solution', 'Fresh Spinal Powder', 'Slough Solution']
    let asked = 0
    const unsure: Reading = { ...pending(), fields: { phase: { sure: false, guess: 'potion' } } }
    const r = await readTitles(img, unsure, async () => texts.shift() ?? '', async () => (asked++, {}))
    expect(r.state.hand).toEqual(['Green Bile Solution', 'Fresh Spinal Powder', 'Slough Solution'])
    expect(asked).toBe(0)
  })
  it('reads five cards when the hand is a Potion Kit’s fan', async () => {
    const texts = ['Eggshell Powder', 'Xeno-Hormone', 'Spinal Solution - Aemberon', 'Twin Hormone - Bone Sentry', 'Anesthetic Tincture - Aemberon']
    const r = await readTitles(img, { ...pending(), handSize: 5 }, async () => texts.shift() ?? '', async () => ({}))
    expect(r.state.hand).toEqual(['Eggshell Powder', 'Xeno-Hormone', 'Spinal Solution - Aemberon', 'Twin Hormone - Bone Sentry', 'Anesthetic Tincture - Aemberon'])
  })
})

describe('the Xenopanacea family (Supreme potions that print only flavour text)', () => {
  it('names the variants seen live', () => {
    expect(nameFit('Xenopanacea: Brood', 'Xenopanaceca: Brood | A single vessel is').q).toBeGreaterThan(nameFit('Xenopanacea: Osteotrophy', 'Xenopanaceca: Brood | A single vessel is').q + 3)
  })
  it('names a variant not seen yet by the family name alone', async () => {
    const texts = ['Xenopanacea: Carapace\nHarden. Let your', 'Green Bile Solution', 'Slough Solution']
    const pending: Reading = { state: { ...emptyState(), phase: 'potion', hand: [] }, fields: { phase: { sure: true, guess: 'potion' } }, problems: [], handPending: true }
    const r = await readTitles(img, pending, async () => texts.shift() ?? '', async () => ({}))
    expect(r.state.hand).toEqual(['Xenopanacea', 'Green Bile Solution', 'Slough Solution'])
  })
})

describe('the Holy Water rites (Supreme potions whose effect is another card later, issue #13)', () => {
  const best = (text: string) => ['First Rite Holy Water: Confession', 'Ritual Holy Water: Flagellation', 'Purest Holy Water'].map(n => [n, nameFit(n, text).q] as const).sort((a, b) => b[1] - a[1])[0][0]
  it('are read by name, even cut short, and never as Purest Holy Water (a different card, simulated)', () => {
    expect(best('First Rite Holy Water: Confession\nThe throat is not only for')).toBe('First Rite Holy Water: Confession')
    expect(best('First Rite Holy Wat')).toBe('First Rite Holy Water: Confession')
    expect(best('Ritual Holy Water: Flagelation | It')).toBe('Ritual Holy Water: Flagellation')
    expect(best('Purest Holy Water\nAwaken all')).toBe('Purest Holy Water')
  })
})

describe('look-alike names on the first try (one name inside another)', () => {
  it('takes the longer name when its extra word was read', () => {
    expect(wholeName('potion', 'Targeted Xeno-Hormone')).toBe('Targeted Xeno-Hormone')
    expect(wholeName('potion', 'Rare Potion Kit (Small)')).toBe('Rare Potion Kit (Small)')
    expect(wholeName('potion', 'Potent Xenopurge Powder')).toBe('Potent Xenopurge Powder')
  })
  it('takes the shorter name when the longer one’s extra word, before it, is clearly missing', () => {
    expect(wholeName('potion', 'Xeno-Hormone')).toBe('Xeno-Hormone')
    expect(wholeName('potion', 'Potion Kit (Small)')).toBe('Potion Kit (Small)')
    expect(wholeName('potion', 'Xenopurge Powder')).toBe('Xenopurge Powder')
  })
  it('a stray fragment is no extra word: "I po" doesn’t make Potent (it settles nothing, and the next try reads on)', () => {
    expect(wholeName('potion', 'I po Xenopurge Powder')).not.toBe('Potent Xenopurge Powder')
  })
  it('a title cut short at its end can’t pass for the name it starts with', () => {
    expect(wholeName('potion', 'Xenopanacea:')).toBeNull()
  })
})
