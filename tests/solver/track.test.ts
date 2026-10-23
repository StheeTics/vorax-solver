import { newTracker, trackInstruments, type InstrumentTracker } from '@/solver/track'
import { emptyState, type Reading } from '@/solver/types'

const reading = (o: { phase?: 'potion' | 'instrument'; round?: number; hand?: string[]; panel: [string, number][][] }): Reading => ({
  state: { ...emptyState(), phase: o.phase ?? 'potion', round: o.round ?? 2, hand: o.hand ?? [], instruments: o.panel.map(r => r[0][0]) },
  fields: {},
  problems: [],
  instrumentRanks: o.panel,
})
const offer = ['Hyperplastic Frontal Lobe', 'Adherent Metatarsals', 'Contracted Claws']

it('a new icon is taken from the instruments just offered, not from all of them', () => {
  let t: InstrumentTracker = newTracker()
  t = trackInstruments(t, reading({ phase: 'instrument', round: 1, hand: offer, panel: [] }), 'screen').tracker
  // the icon looks most like Hypertrophic Pituitary (also a brain), which wasn't on offer
  const r = trackInstruments(t, reading({ panel: [[['Hypertrophic Pituitary', 0.98], ['Hyperplastic Frontal Lobe', 0.97], ['Contracted Claws', 0.6]]] }), 'board')
  expect(r.instruments).toEqual(['Hyperplastic Frontal Lobe'])
})

it('once known, instruments are kept while the icon count stays the same', () => {
  let t = newTracker()
  t = { ...t, owned: ['Hyperplastic Frontal Lobe'] }
  const r = trackInstruments(t, reading({ panel: [[['Aberrant Sprout', 0.99]]] }), 'board')
  expect(r.instruments).toEqual(['Hyperplastic Frontal Lobe'])
  expect(r.fields.instrument0.sure).toBe(true)
})

it('a new icon that matches none of the offer well is flagged unsure', () => {
  let t = newTracker()
  t = { ...t, owned: [], offer }
  const r = trackInstruments(t, reading({ panel: [[['Aberrant Sprout', 0.99], ['Contracted Claws', 0.5], ['Hyperplastic Frontal Lobe', 0.3], ['Adherent Metatarsals', 0.2]]] }), 'board')
  expect(r.instruments).toEqual(['Contracted Claws'])
  expect(r.fields.instrument0.sure).toBe(false)
})

it('a game start forgets the last game', () => {
  const t = { ...newTracker(), owned: ['Sinew Garrote'] }
  const r = trackInstruments(t, reading({ phase: 'instrument', round: 1, hand: offer, panel: [] }), 'screen')
  expect(r.instruments).toEqual([])
})

it("the player's correction is kept", () => {
  const t = trackInstruments({ ...newTracker(), owned: ['Black Goat Gut Suture'] }, reading({ panel: [[['Aberrant Sprout', 0.99]]] }), 'board')
  expect(t.instruments).toEqual(['Black Goat Gut Suture'])
})

it('when a pick and the next offer show at once, the new instrument comes from the previous offer', () => {
  const t = { ...newTracker(), owned: ['Hyperplastic Frontal Lobe'], offer: ['Two-Inch Skull Nail', 'Sloughed Cortex', 'Black Goat Gut Suture'] }
  const r = trackInstruments(t, reading({
    phase: 'instrument', round: 3, hand: ['Clustered Eggs', 'Rawhide Restraint', 'Fouled Scraper'],
    panel: [[['Hyperplastic Frontal Lobe', 0.99]], [['Rawhide Restraint', 0.7], ['Black Goat Gut Suture', 0.95]]],
  }), 'board')
  expect(r.instruments).toEqual(['Hyperplastic Frontal Lobe', 'Black Goat Gut Suture'])
  expect(r.tracker.offer).toEqual(['Clustered Eggs', 'Rawhide Restraint', 'Fouled Scraper'])
})

it('a new icon unlike every offered instrument we have pictures of is the offered one we have none of', () => {
  const t = { ...newTracker(), owned: [], offer: ['Eyelid Speculum', 'Contracted Claws', 'Rawhide Restraint'] }
  // no panel picture of Eyelid Speculum exists yet, so it isn't among the icon matches at all
  const r = trackInstruments(t, reading({ panel: [[['Hypertrophic Pituitary', 0.55], ['Contracted Claws', 0.41], ['Rawhide Restraint', 0.38]]] }), 'board')
  expect(r.instruments).toEqual(['Eyelid Speculum'])
  expect(r.fields.instrument0.sure).toBe(false)
})

it('with two offered instruments not yet pictured, the new icon is taken to be one of them, not a pictured one it doesn’t match', () => {
  const t = { ...newTracker(), owned: [], offer: ['Eyelid Speculum', 'Incubation Sac', 'Rawhide Restraint'] }
  const r = trackInstruments(t, reading({ panel: [[['Hypertrophic Pituitary', 0.55], ['Rawhide Restraint', 0.41]]] }), 'board')
  expect(['Eyelid Speculum', 'Incubation Sac']).toContain(r.instruments[0])
  expect(r.fields.instrument0.sure).toBe(false)
})

/** The same panel read on `n` more boards. */
const again = (t: InstrumentTracker, panel: [string, number][][], n: number) => {
  let r = trackInstruments(t, reading({ round: 3, panel }), 'board')
  for (let i = 1; i < n; i++) r = trackInstruments(r.tracker, reading({ round: 3, panel }), 'board')
  return r
}

it('asks which instrument was picked when the next look can’t tell either (the offer had one with no icon picture)', () => {
  const t = { ...newTracker(), owned: [], offer: ['Egg-Burdened Butterfly', 'Rawhide Restraint', 'Vermicular Spinal Cord'] }
  const panel: [string, number][][] = [[['Hypertrophic Pituitary', 0.55], ['Rawhide Restraint', 0.41]]]
  const first = trackInstruments(t, reading({ panel }), 'board')
  expect(first.ask).toBeUndefined()
  expect(again(first.tracker, panel, 1).ask).toEqual({ offer: ['Egg-Burdened Butterfly', 'Rawhide Restraint', 'Vermicular Spinal Cord'], slot: 0 })
  // asked once, not on every look after
  expect(again(first.tracker, panel, 2).ask).toBeUndefined()
})

it('doesn’t judge a new icon on the first picture after the pick (it can still be sliding in): no question then', () => {
  const t = { ...newTracker(), owned: [], offer }
  const r = trackInstruments(t, reading({ panel: [[['Hyperplastic Frontal Lobe', 0.4], ['Contracted Claws', 0.3]]] }), 'board')
  expect(r.fields.instrument0.sure).toBe(false)
  expect(r.ask).toBeUndefined()
  // the next board shows it clearly: settled, never asked
  const next = trackInstruments(r.tracker, reading({ round: 3, panel: [[['Contracted Claws', 0.96], ['Adherent Metatarsals', 0.5]]] }), 'board')
  expect(next.instruments).toEqual(['Contracted Claws'])
  expect(next.ask).toBeUndefined()
})

it('doesn’t ask when the new icon clearly is one of the offer', () => {
  const t = { ...newTracker(), owned: [], offer: ['Egg-Burdened Butterfly', 'Rawhide Restraint', 'Vermicular Spinal Cord'] }
  const r = trackInstruments(t, reading({ panel: [[['Rawhide Restraint', 0.98], ['Hypertrophic Pituitary', 0.55]]] }), 'board')
  expect(r.instruments).toEqual(['Rawhide Restraint'])
  expect(r.ask).toBeUndefined()
})

describe('a screen that shows something in the panel before any instrument is picked (seen on 16:9)', () => {
  const offer1 = ['Contracted Claws', 'Aberrant Sprout', 'Prismatic Liver']
  it('isn’t taken as a pick', () => {
    const t = trackInstruments(newTracker(), reading({ phase: 'instrument', round: 1, hand: offer1, panel: [[['Incubation Sac', 0.46], ['Contracted Claws', 0.4]]] }), 'screen')
    expect(t.instruments).toEqual([])
    expect(t.ask).toBeUndefined()
  })
  it('and the real pick is then taken from that offer', () => {
    const first = trackInstruments(newTracker(), reading({ phase: 'instrument', round: 1, hand: offer1, panel: [[['Incubation Sac', 0.46]]] }), 'screen')
    const after = trackInstruments(first.tracker, reading({ panel: [[['Aberrant Sprout', 0.96], ['Hyperplastic Frontal Lobe', 0.83]]] }), 'board')
    expect(after.instruments).toEqual(['Aberrant Sprout'])
    expect(after.fields.instrument0.sure).toBe(true)
  })
  it('a later offer can still show a new pick in the panel beside it', () => {
    const t = { ...newTracker(), owned: ['Aberrant Sprout'], offer: ['Eyelid Speculum', 'Pig Iron Bone Saw', 'Two-Inch Skull Nail'] }
    const r = trackInstruments(t, reading({ phase: 'instrument', round: 3, hand: ['Tanned Leather Restraint', 'Canine Teeth File', 'Fouled Scraper'], panel: [[['Aberrant Sprout', 0.96]], [['Pig Iron Bone Saw', 0.97]]] }), 'board')
    expect(r.instruments).toEqual(['Aberrant Sprout', 'Pig Iron Bone Saw'])
  })
})

it('asks which instrument was picked whenever it stays unsure, even when it has pictures of all the offer, so answers keep training it', () => {
  let t = newTracker()
  t = { ...t, owned: [], offer }
  // every offered instrument has a picture, but the new icon matches none of them well
  const panel: [string, number][][] = [[['Hyperplastic Frontal Lobe', 0.62], ['Adherent Metatarsals', 0.6], ['Contracted Claws', 0.4]]]
  const r = trackInstruments(t, reading({ panel }), 'board')
  expect(r.fields.instrument0.sure).toBe(false)
  expect(again(r.tracker, panel, 1).ask).toEqual({ offer, slot: 0 })
})

describe('a pick the Solver wasn’t sure of stays unsure until the player says', () => {
  const unsurePick = () => {
    let t = newTracker()
    t = { ...t, owned: [], offer: ['Hypertrophic Pituitary', 'Hyperplastic Frontal Lobe', 'Chrysalis Specimen'] }
    return trackInstruments(t, reading({ panel: [[['Hyperplastic Frontal Lobe', 0.515], ['Chrysalis Specimen', 0.2], ['Hypertrophic Pituitary', 0.1]]] }), 'board')
  }
  it('on the boards after it too, with the offer it came from', () => {
    const first = unsurePick()
    expect(first.fields.instrument0.sure).toBe(false)
    const later = trackInstruments(first.tracker, reading({ round: 3, panel: [[['Hyperplastic Frontal Lobe', 0.5]]] }), 'board')
    expect(later.fields.instrument0).toMatchObject({ sure: false, guess: 'Hyperplastic Frontal Lobe' })
    expect(later.tracker.unsure).toMatchObject([{ slot: 0, offer: ['Hypertrophic Pituitary', 'Hyperplastic Frontal Lobe', 'Chrysalis Specimen'] }])
  })
  it('until confirmed', async () => {
    const { confirmPick } = await import('@/solver/track')
    const t = confirmPick(unsurePick().tracker, 0, 'Chrysalis Specimen')
    expect(t.owned).toEqual(['Chrysalis Specimen'])
    expect(t.unsure).toEqual([])
    const later = trackInstruments(t, reading({ round: 3, panel: [[['Hyperplastic Frontal Lobe', 0.5]]] }), 'board')
    expect(later.fields.instrument0).toEqual({ sure: true, guess: 'Chrysalis Specimen' })
  })
  it('confirming a slot the tracker doesn’t hold yet (a demo board, a game joined mid-way) still sets it', async () => {
    const { confirmPick } = await import('@/solver/track')
    expect(confirmPick(newTracker(), 0, 'Two-Inch Skull Nail').owned).toEqual(['Two-Inch Skull Nail'])
  })
  it('settles by itself when a later board shows the icon clearly (the first picture can catch it sliding in)', () => {
    const first = unsurePick()
    const later = trackInstruments(first.tracker, reading({ round: 3, panel: [[['Chrysalis Specimen', 0.95], ['Hyperplastic Frontal Lobe', 0.5]]] }), 'board')
    expect(later.instruments).toEqual(['Chrysalis Specimen'])
    expect(later.fields.instrument0).toMatchObject({ sure: true, guess: 'Chrysalis Specimen' })
    expect(later.tracker.unsure).toEqual([])
    expect(later.settled).toEqual([0])
  })
  it('only from the offer it came from, and only when clear', () => {
    const first = unsurePick()
    // clear, but not one of the offer
    expect(trackInstruments(first.tracker, reading({ round: 3, panel: [[['Aberrant Sprout', 0.97]]] }), 'board').tracker.unsure).toHaveLength(1)
    // one of the offer, but not clear enough
    expect(trackInstruments(first.tracker, reading({ round: 3, panel: [[['Chrysalis Specimen', 0.6]]] }), 'board').tracker.unsure).toHaveLength(1)
  })
  it('a sure pick isn’t kept as unsure', () => {
    let t = newTracker()
    t = { ...t, owned: [], offer }
    const r = trackInstruments(t, reading({ panel: [[['Contracted Claws', 0.97], ['Adherent Metatarsals', 0.5]]] }), 'board')
    expect(r.tracker.unsure).toEqual([])
  })
})

describe('a starting item: something in the panel before any instrument is picked (it shapes the starting tanks)', () => {
  const offer1 = ['Incubation Sac', 'Hyperplastic Frontal Lobe', 'Chrysalis Specimen']
  // as seen 2026-10-19: the starting item read as Eyelid Speculum, and every pick after it was one slot off
  const start = () => trackInstruments(newTracker(), reading({ phase: 'instrument', round: 1, hand: offer1, panel: [[['Eyelid Speculum', 0.41]]] }), 'board')
  it('isn’t an instrument', () => {
    expect(start().instruments).toEqual([])
    expect(start().tracker.start).toBe(1)
  })
  it('the picks after it are read from their own slots, beside it', () => {
    const after = trackInstruments(start().tracker, reading({ panel: [[['Eyelid Speculum', 0.41]], [['Incubation Sac', 0.96], ['Chrysalis Specimen', 0.3]]] }), 'board')
    expect(after.instruments).toEqual(['Incubation Sac'])
    expect(after.fields.instrument0).toMatchObject({ sure: true, guess: 'Incubation Sac' })
    expect(after.fields).not.toHaveProperty('instrument1')
  })
  it('a game joined later with four icons: the oldest is a starting item (three picks at most)', () => {
    const r = trackInstruments(newTracker(), reading({ round: 9, panel: [[['Eyelid Speculum', 0.41]], [['Incubation Sac', 0.96]], [['Pig Iron Bone Saw', 0.95]], [['Rawhide Restraint', 0.97]]] }), 'board')
    expect(r.instruments).toEqual(['Incubation Sac', 'Pig Iron Bone Saw', 'Rawhide Restraint'])
  })
  it('a new game forgets it', () => {
    const next = trackInstruments(start().tracker, reading({ phase: 'instrument', round: 1, hand: offer1, panel: [] }), 'screen')
    expect(next.tracker.start).toBe(0)
  })
})

describe('the round each instrument was picked in (for the instruments that fire every few rounds)', () => {
  const second = ['Lady of the Plague Quarter', 'Sinew Garrote', 'Pig Iron Bone Saw']
  const start = () => trackInstruments(newTracker(), reading({ phase: 'instrument', round: 1, hand: offer, panel: [] }), 'screen').tracker
  it('the first pick is round 1; a later one is the round of the board it shows up on', () => {
    let t = trackInstruments(start(), reading({ round: 1, panel: [[['Contracted Claws', 0.99]]] }), 'board').tracker
    t = trackInstruments(t, reading({ phase: 'instrument', round: 3, hand: second, panel: [[['Contracted Claws', 0.99]]] }), 'board').tracker
    const r = trackInstruments(t, reading({ round: 4, panel: [[['Contracted Claws', 0.99]], [['Lady of the Plague Quarter', 0.99]]] }), 'board')
    expect(r.rounds).toEqual([1, 4])
  })
  it('a pick that shows up beside the next offer: that screen shows the round just played, so it is the next one', () => {
    let t = trackInstruments(start(), reading({ round: 1, panel: [[['Contracted Claws', 0.99]]] }), 'board').tracker
    t = trackInstruments(t, reading({ phase: 'instrument', round: 3, hand: second, panel: [[['Contracted Claws', 0.99]]] }), 'board').tracker
    const r = trackInstruments(t, reading({ phase: 'instrument', round: 5, hand: offer, panel: [[['Contracted Claws', 0.99]], [['Lady of the Plague Quarter', 0.99]]] }), 'board')
    expect(r.rounds).toEqual([1, 6])
  })
  it('instruments read as they are (a game joined mid-way): rounds not known', () => {
    const r = trackInstruments(newTracker(), reading({ round: 6, panel: [[['Contracted Claws', 0.99]], [['Lady of the Plague Quarter', 0.99]]] }), 'board')
    expect(r.rounds).toEqual([0, 0])
  })
})

// Oct 23: a run began with a flask the game puts in the instrument panel (never offered), and the Vorax screen
// was opened again mid-run; the Solver forgot the run and read the flask as Incubation Sac (0.65)
const FLASK: [string, number][] = [['Incubation Sac', 0.65], ['Chrysalis Specimen', 0.64]]

it('the screen opened again mid-run keeps the run: its picks and its starting item', () => {
  let t = newTracker()
  t = trackInstruments(t, reading({ phase: 'instrument', round: 1, hand: offer, panel: [FLASK] }), 'screen').tracker
  t = trackInstruments(t, reading({ panel: [FLASK, [['Contracted Claws', 0.97]]] }), 'board').tracker
  expect(t.owned).toEqual(['Contracted Claws'])
  const r = trackInstruments(t, reading({ round: 4, panel: [FLASK, [['Contracted Claws', 0.97]]] }), 'screen')
  expect(r.instruments).toEqual(['Contracted Claws'])
})

it('joined mid-run, an icon in the oldest slot like no instrument we know is a starting item, not a guess', () => {
  const r = trackInstruments(newTracker(), reading({ round: 4, panel: [FLASK, [['Chrysalis Specimen', 0.95]], [['Beak of the Twice-Born', 1]]] }), 'board')
  expect(r.instruments).toEqual(['Chrysalis Specimen', 'Beak of the Twice-Born'])
})
