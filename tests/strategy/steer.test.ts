import { toState } from '@/strategy/advisor'
import { buildProgress } from '@/strategy/steer'
import { evChooser } from '@/strategy/bot'
import type { Archetype, Monster, Rarity } from '@/engine/types'

const m = (archetype: Archetype, rarity: Rarity = 'normal'): Monster => ({ archetype, rarity, activity: 10, quantity: 10 })
const board = (instruments: string[], tanks: (Monster | null)[]) => toState({ tanks: [...tanks, ...Array(6 - tanks.length).fill(null)], hand: [], instruments, phase: 'potion', round: 3 }, [])

describe('how far the board is toward what the instruments need (0 to 1)', () => {
  it('Incubation Sac needs 2 groups of Pests', () => {
    expect(buildProgress(board(['Incubation Sac'], [m('boneSentry')]))).toBe(0)
    expect(buildProgress(board(['Incubation Sac'], [m('pest'), m('boneSentry')]))).toBe(0.5)
    expect(buildProgress(board(['Incubation Sac'], [m('pest'), m('pest'), m('pest')]))).toBe(1)
  })
  it('Rawhide Restraint needs 3 groups of Magic monsters', () => {
    expect(buildProgress(board(['Rawhide Restraint'], [m('pest', 'magic'), m('agito', 'normal')]))).toBeCloseTo(1 / 3)
  })
  it('Tanned Leather Restraint needs Normal, Magic and Rare (or Boss) monsters', () => {
    expect(buildProgress(board(['Tanned Leather Restraint'], [m('pest', 'normal'), m('agito', 'boss')]))).toBeCloseTo(2 / 3)
  })
  it('Hypertrophic Pituitary needs a Rare or Boss Agito: any Agito is half way', () => {
    expect(buildProgress(board(['Hypertrophic Pituitary'], [m('agito', 'magic')]))).toBe(0.5)
    expect(buildProgress(board(['Hypertrophic Pituitary'], [m('agito', 'rare')]))).toBe(1)
  })
  it('Chrysalis Specimen wants 6 groups of Pests (its bonus grows with every Pest)', () => {
    expect(buildProgress(board(['Chrysalis Specimen'], [m('pest'), m('boneSentry')]))).toBeCloseTo(1 / 6)
    expect(buildProgress(board(['Chrysalis Specimen'], [m('pest'), m('pest'), m('pest')]))).toBe(0.5)
    expect(buildProgress(board(['Chrysalis Specimen'], Array.from({ length: 6 }, () => m('pest'))))).toBe(1)
  })
  it('Egg-Burdened Butterfly needs 2 groups of Pests', () => {
    expect(buildProgress(board(['Egg-Burdened Butterfly'], [m('pest'), m('agito')]))).toBe(0.5)
    expect(buildProgress(board(['Egg-Burdened Butterfly'], [m('pest'), m('pest')]))).toBe(1)
  })
  it('instruments without a condition, or none, ask for nothing', () => {
    expect(buildProgress(board(['Contracted Claws'], [m('pest')]))).toBe(1)
    expect(buildProgress(board([], [m('pest')]))).toBe(1)
  })
  it('several instruments: the average of their progress', () => {
    expect(buildProgress(board(['Incubation Sac', 'Adherent Metatarsals'], [m('pest'), m('pest')]))).toBe(0.5)
  })
})

describe('futures that steer toward the build', () => {
  // live game (Vorax Overlay, 2026-10-18), round 3: Incubation Sac with one Pest (tank 4). Played for this
  // round's score alone, Petrified Spinal Solution turned that Pest into an Aemberon (under the odds of then:
  // not tested, since the hourly loop changes the odds and with them that unsteered choice).
  const incubation = toState({
    tanks: [
      { archetype: 'boneSentry', rarity: 'normal', activity: 1, quantity: 36 },
      { archetype: 'boneSentry', rarity: 'normal', activity: 32, quantity: 36 },
      { archetype: 'boneSentry', rarity: 'normal', activity: 32, quantity: 36 },
      { archetype: 'pest', rarity: 'magic', activity: 5, quantity: 97 },
      null, null,
    ],
    hand: ['Petrified Spinal Solution', 'Slender-Limb Powder - Pest', 'Spinal Solution - Agito'],
    instruments: ['Incubation Sac'],
    phase: 'potion',
    round: 3,
    potionRefreshes: 3,
  }, [])
  const pick = (r: { best: { type: string }[] }) => incubation.hand[(r.best[0] as unknown as { index: number }).index].id

  it('steered, it adds the second Pest Incubation Sac needs', () => {
    expect(pick(evChooser({ samples: 2, horizon: 0, steer: 0.3 })(incubation, 1))).toBe(23)
  })
})
