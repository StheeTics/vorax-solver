import { nameFit, readTitles } from '@/solver/scan/titles'
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

  it('asks for no pictures when every name reads', async () => {
    const texts = ['Green Bile Solution', 'Fresh Spinal Powder', 'Slough Solution']
    let asked = 0
    const r = await readTitles(img, pending(), async () => texts.shift() ?? '', async () => (asked++, {}))
    expect(r.state.hand).toEqual(['Green Bile Solution', 'Fresh Spinal Powder', 'Slough Solution'])
    expect(asked).toBe(0)
    expect(r.handPending).toBeUndefined()
  })
  it('asks for pictures of only the cards it can’t name', async () => {
    const texts = ['Green Bile Solution', '~~', 'Slough Solution']
    const asked: number[][] = []
    const r = await readTitles(img, pending(), async () => texts.shift() ?? '', async (_phase, _size, slots) => {
      asked.push(slots)
      return { 1: { ranks: [['Fresh Spinal Powder', 0.97]], field: { sure: true, guess: 'Fresh Spinal Powder' }, unknown: false } }
    })
    expect(asked).toEqual([[1]])
    expect(r.state.hand).toEqual(['Green Bile Solution', 'Fresh Spinal Powder', 'Slough Solution'])
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
