import { board, ctx, m } from '../helpers'
import { INSTRUMENTS, runEndOfRound, BASIC_POOL, ADVANCED_POOL } from '@/data/instruments'
import { stubRng, type Rng } from '@/engine/rng'
import type { EquippedInstrument, Monster, Tanks } from '@/engine/types'

const eq = (...ids: number[]): EquippedInstrument[] => ids.map(id => ({ id, acquiredRound: 1 }))
function setup(tanks: Tanks, ids: number[], round = 1, rng?: Rng) {
  return { ...ctx(tanks, { instruments: eq(...ids), round, rng }), tanks }
}
function endRound(tanks: Tanks, ids: number[], round = 1, rng?: Rng) {
  const r = setup(tanks, ids, round, rng)
  runEndOfRound(r.c, eq(...ids), round)
  return r
}
const sumQty = (t: Tanks) => t.reduce((s, x) => s + (x?.quantity ?? 0), 0)
const n = (k: number, f: () => Monster) => Array.from({ length: k }, f)

describe('basic instruments', () => {
  it('1 Chrysalis Specimen adds 8×X×X Quantity', () => {
    const t = board(m('pest', 'normal'), m('pest', 'normal'), m('boneSentry', 'normal'))
    const before = sumQty(t)
    endRound(t, [1])
    expect(sumQty(t) - before).toBe(32)
  })
  it('2 Incubation Sac', () => {
    const t = board(m('pest', 'normal'), m('pest', 'normal'))
    setup(t, [2]).c.add('boneSentry', 'normal')
    expect(t.slice(0, 3).map(x => x!.quantity)).toEqual([81, 81, 81])
    const u = board(m('pest', 'normal'))
    setup(u, [2]).c.add('boneSentry', 'normal')
    expect(u[0]!.quantity).toBe(36)
  })
  it('3 Hyperplastic Prefrontal Lobe', () => {
    const t = board(m('agito', 'normal'), m('agito', 'rare'))
    endRound(t, [3])
    expect(t[1]!.activity).toBe(95)
  })
  it('4 Swollen Pituitary', () => {
    const t = board(m('agito', 'rare'), m('pest', 'normal'))
    endRound(t, [4])
    expect(t[0]!.activity).toBe(95)
    const u = board(m('agito', 'magic'), m('pest', 'normal'))
    endRound(u, [4])
    expect(u[0]!.activity).toBe(5)
    expect(u[1]!.activity).toBe(1)
  })
  it('5 Fused Metatarsals', () => {
    const t = board(m('boneSentry', 'normal'), m('boneSentry', 'normal'), m('pest', 'normal'))
    setup(t, [5]).c.remove(2)
    expect(t[0]!.quantity).toBe(216)
  })
  it('6 Contracted Claws', () => {
    const t = board(m('pest', 'normal'), m('boneSentry', 'normal'))
    setup(t, [6]).c.remove(0)
    expect(t[1]!.quantity).toBe(186)
    const u = board(m('pest', 'normal'), m('boneSentry', 'normal'))
    setup(u, [6]).c.remove(1)
    expect(u[0]!.quantity).toBe(36)
  })
  it('7 Wicked Granulation', () => {
    const t = board(m('pest', 'normal'), m('aemberon', 'normal'))
    setup(t, [7]).c.mutate(0, 'aemberon', 'normal')
    expect([t[0]!.activity, t[1]!.activity]).toEqual([36, 36])
  })
  it('8 Mottled Liver', () => {
    const t = board(m('aemberon', 'normal'), m('aemberon', 'normal'), m('pest', 'normal'))
    setup(t, [8]).c.mutate(2, 'pest', 'normal')
    expect(t.slice(0, 3).map(x => x!.activity)).toEqual([21, 21, 21])
  })
})

describe('advanced instruments', () => {
  it('9 Clustered Eggs', () => {
    const t = board(...n(3, () => m('pest', 'normal')))
    endRound(t, [9])
    expect(t[3]).toEqual({ archetype: 'pest', rarity: 'normal', activity: 1, quantity: 136 })
  })
  it('10 Molted Cortex', () => {
    const t = board(m('aemberon', 'magic'), m('pest', 'magic'))
    endRound(t, [10])
    expect(t[0]).toEqual({ archetype: 'agito', rarity: 'rare', activity: 10, quantity: 48 })
    expect(t[1]).toBeNull()
  })
  it('11 Sinew Garrote', () => {
    const t = board(m('boneSentry', 'normal'), m('boneSentry', 'normal'), m('aemberon', 'normal'), m('pest', 'magic'))
    endRound(t, [11])
    expect(t[2]).toBeNull()
    expect(t[0]).toMatchObject({ activity: 2, quantity: 72 })
  })
  it('12 Writhing Spine', () => {
    const t = board()
    setup(t, [12]).c.add('pest', 'normal')
    expect(t[0]).toMatchObject({ archetype: 'aemberon', activity: 81 })
  })
  it('13 Rawhide Restraint', () => {
    const t = board(m('aemberon', 'magic'), m('pest', 'magic'), m('agito', 'magic'), m('boneSentry', 'rare'))
    endRound(t, [13])
    expect(t[3]!.quantity).toBe(112)
  })
  it('14 Black Goat Gut Suture fuses triples live up the tiers', () => {
    const t = board(...n(3, () => m('pest', 'normal')), m('aemberon', 'magic'), m('agito', 'magic'))
    endRound(t, [14])
    expect(t[0]).toEqual({ archetype: 'pest', rarity: 'rare', activity: 13, quantity: 156 })
    expect(t.slice(1).every(x => x === null)).toBe(true)
  })
  it('15 Pig-Iron Bone Saw', () => {
    const t = board(m('aemberon', 'normal', 151, 151), m('aemberon', 'normal', 150, 200))
    endRound(t, [15])
    expect(t[0]).toMatchObject({ activity: 166, quantity: 166 })
    expect(t[1]).toMatchObject({ activity: 150, quantity: 200 })
  })
  it('16 Two-Inch Skull Nail', () => {
    const t = board(...n(5, () => m('pest', 'normal')), m('boneSentry', 'rare'))
    setup(t, [16]).c.add('pest', 'normal')
    expect(t[0]).toMatchObject({ activity: 26, quantity: 61 })
  })
  it('17 Foul Scraper', () => {
    const t = board(m('pest', 'normal', 1, 276), m('pest', 'normal', 1, 275))
    endRound(t, [17])
    expect([t[0]!.activity, t[1]!.activity]).toEqual([21, 1])
  })
  it('18 Canine Teeth File', () => {
    const t = board(m('pest', 'normal', 256, 1), m('pest', 'normal', 255, 1))
    endRound(t, [18])
    expect([t[0]!.quantity, t[1]!.quantity]).toEqual([31, 1])
  })
  it('19 Plague Madonna fires every 2 rounds and snapshots tiers', () => {
    const t = board(m('pest', 'normal'), m('pest', 'magic'))
    const r2 = endRound(t, [19], 2)
    expect(r2.events.filter(e => e.type === 'awaken')).toHaveLength(0)
    endRound(t, [19], 3)
    expect(t[0]).toMatchObject({ rarity: 'magic', activity: 61 })
    expect(t[1]).toMatchObject({ rarity: 'rare', activity: 125 })
  })
  it('20 Alien Stinger fires every 3 rounds', () => {
    const t = board(m('pest', 'normal'))
    expect(endRound(t, [20], 3).events.filter(e => e.type === 'mutate')).toHaveLength(0)
    expect(endRound(t, [20], 4).events.filter(e => e.type === 'mutate')).toHaveLength(1)
  })
  it('21 Tanned Leather Restraint (Boss counts as Rare)', () => {
    const cases: [Tanks, number][] = [
      [board(m('pest', 'normal'), m('pest', 'magic'), m('pest', 'boss')), 20],
      [board(m('pest', 'normal'), m('pest', 'magic'), m('pest', 'rare')), 20],
      [board(m('pest', 'normal'), m('pest', 'magic')), 0],
      [board(m('pest', 'normal'), m('pest', 'rare'), m('pest', 'boss')), 0],
    ]
    for (const [t, gain] of cases) {
      const before = t[0]!.activity
      endRound(t, [21])
      expect(t[0]!.activity - before).toBe(gain)
    }
  })
  it('22 Eyelid Retractor', () => {
    const t = board(m('aemberon', 'normal'), m('boneSentry', 'rare'))
    setup(t, [22]).c.remove(0)
    expect(t[1]).toMatchObject({ activity: 35, quantity: 32 })
  })
  it('23 Beak of the Twice-Born', () => {
    const t = board(m('pest', 'normal'), m('pest', 'normal'))
    endRound(t, [23])
    expect(t[2]).not.toBeNull()
    const full = board(m('pest', 'normal'), m('pest', 'magic'), m('pest', 'rare'), m('aemberon', 'normal', 2), m('aemberon', 'normal', 3), m('boneSentry', 'boss'))
    endRound(full, [23])
    expect(full[0]).toBeNull()
    expect(full[5]).toMatchObject({ activity: 301, quantity: 37 })
    expect(full.filter(Boolean)).toHaveLength(5)
    const one = board(m('pest', 'normal'))
    endRound(one, [23])
    expect(one.filter(Boolean)).toHaveLength(1)
  })
  it('24 Nettle Knot', () => {
    const t = board(...n(3, () => m('pest', 'normal')))
    endRound(t, [24])
    expect(t.slice(0, 3).map(x => x!.quantity)).toEqual([66, 66, 66])
    const u = board(m('pest', 'normal'), m('pest', 'normal'))
    endRound(u, [24])
    expect(u[0]!.quantity).toBe(36)
  })
})

describe('pools and timing', () => {
  it('has 24 instruments with the spec timings', () => {
    expect(INSTRUMENTS).toHaveLength(24)
    expect(INSTRUMENTS.filter(i => i.timing.kind === 'reactive').map(i => i.id)).toEqual([2, 5, 6, 7, 8, 12, 16, 22])
    expect(INSTRUMENTS.filter(i => i.timing.kind === 'periodic').map(i => i.id)).toEqual([19, 20])
    expect(BASIC_POOL.map(i => i.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(ADVANCED_POOL).toHaveLength(16)
  })
  it('reactive instruments fire immediately in id order (Sac before Spine)', () => {
    const t = board(m('pest', 'normal'), m('pest', 'normal'))
    const { c, log } = setup(t, [12, 2], 1, stubRng([0]))
    c.add('pest', 'normal')
    const sac = log.findIndex(l => l.text.includes('Incubation Sac'))
    const spine = log.findIndex(l => l.text.includes('Writhing Spine'))
    expect(sac).toBeGreaterThanOrEqual(0)
    expect(sac).toBeLessThan(spine)
    expect(t[2]!.quantity).toBe(81)
  })
})

import { instrument } from '@/data/instruments'

it('uses instrument names confirmed from the English client', () => {
  expect([7, 10, 15, 17, 24].map(id => instrument(id)!.name)).toEqual(['Aberrant Sprout', 'Sloughed Cortex', 'Pig Iron Bone Saw', 'Fouled Scraper', 'Nettle Toggle'])
})
