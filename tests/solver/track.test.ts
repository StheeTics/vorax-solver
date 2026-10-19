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

it('asks which instrument was picked when it can’t tell and the offer had one with no icon picture', () => {
  const t = { ...newTracker(), owned: [], offer: ['Egg-Burdened Butterfly', 'Rawhide Restraint', 'Vermicular Spinal Cord'] }
  const r = trackInstruments(t, reading({ panel: [[['Hypertrophic Pituitary', 0.55], ['Rawhide Restraint', 0.41]]] }), 'board')
  expect(r.ask).toEqual({ offer: ['Egg-Burdened Butterfly', 'Rawhide Restraint', 'Vermicular Spinal Cord'], slot: 0 })
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

it('asks which instrument was picked whenever it isn’t confident, even when it has pictures of all the offer, so answers keep training it', () => {
  let t = newTracker()
  t = { ...t, owned: [], offer }
  // every offered instrument has a picture, but the new icon matches none of them well
  const r = trackInstruments(t, reading({ panel: [[['Hyperplastic Frontal Lobe', 0.62], ['Adherent Metatarsals', 0.6], ['Contracted Claws', 0.4]]] }), 'board')
  expect(r.fields.instrument0.sure).toBe(false)
  expect(r.ask).toEqual({ offer, slot: 0 })
})
