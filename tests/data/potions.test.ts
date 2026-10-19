import { board, ctx, m, rollFor } from '../helpers'
import { POTIONS, potion, BOX_POOL, SUPREME_POOL, NORMAL_POOL } from '@/data/potions'
import { stubRng, type Rng } from '@/engine/rng'
import type { Tanks } from '@/engine/types'

function run(id: number, tanks: Tanks, targets: number[] = [], rng?: Rng) {
  const r = ctx(tanks, { rng })
  potion(id).effect!(r.c, targets)
  return r
}
const act = (t: Tanks, i: number) => t[i]!.activity
const qty = (t: Tanks, i: number) => t[i]!.quantity

describe('rare potions', () => {
  it('0 Probiotic Enzyme Solution', () => {
    const t = board(m('pest', 'normal'), m('pest', 'normal'), m('boneSentry', 'normal'))
    run(0, t)
    expect([act(t, 0), act(t, 1), act(t, 2)]).toEqual([23, 23, 1])
  })
  it('1 Slough Solution', () => {
    const t = board(m('aemberon', 'magic'), m('boneSentry', 'rare'))
    run(1, t, [0, 1])
    expect(t[0]).toMatchObject({ archetype: 'pest', activity: 20, quantity: 36 })
    expect(t[1]).toBeNull()
  })
  it('2 Leptomeningeal Solution', () => {
    for (const [mon, expected] of [[m('agito', 'magic'), 65], [m('agito', 'rare'), 105], [m('aemberon', 'magic'), 35]] as const) {
      const t = board(mon)
      run(2, t, [0])
      expect(act(t, 0)).toBe(expected)
    }
  })
  it('3 Bone-Melting Ointment', () => {
    const t = board(m('boneSentry', 'normal'), m('aemberon', 'normal'), m('pest', 'normal'))
    run(3, t)
    expect(t[1]).toBeNull(); expect(t[2]).toBeNull()
    expect(t[0]).toMatchObject({ activity: 57, quantity: 92 })
    const u = board(m('aemberon', 'normal'))
    run(3, u)
    expect(u[0]).toEqual(m('aemberon', 'normal'))
  })
  it('4 Cleansing Ointment', () => {
    const t = board(m('boneSentry', 'normal'), null, m('aemberon', 'normal'))
    run(4, t, [0])
    expect(t[0]).toMatchObject({ activity: 21, quantity: 77 })
    expect(t[2]).toBeNull()
    const u = board(m('pest', 'normal'), m('agito', 'normal'))
    run(4, u, [0])
    expect(u[0]).toMatchObject({ activity: 21, quantity: 36 })
    expect(u[1]).not.toBeNull()
  })
  it('5 Fresh Spinal Powder', () => {
    const t = board(m('aemberon', 'normal'), m('pest', 'normal'))
    run(5, t)
    expect(t.slice(0, 2).map(x => x!.archetype)).toEqual(['aemberon', 'aemberon'])
    expect([qty(t, 0), qty(t, 1)]).toEqual([78, 78])
  })
  it('6 Petrified Spinal Solution', () => {
    const t = board(m('pest', 'normal'))
    run(6, t, [0])
    expect(t[0]).toMatchObject({ archetype: 'aemberon', activity: 51 })
    const u = board(m('aemberon', 'normal'))
    run(6, u, [0])
    expect(act(u, 0)).toBe(21)
  })
})

describe('magic potions', () => {
  it('7 Active Ovulation Hormone', () => {
    const t = board(); run(7, t, [], stubRng([0]))
    expect(t.filter(x => x?.archetype === 'pest')).toHaveLength(3)
    const u = board(); run(7, u, [], stubRng([0.99]))
    expect(u.filter(Boolean)).toHaveLength(1)
  })
  it('8 Eggshell Powder', () => {
    const t = board(m('pest', 'rare'))
    run(8, t)
    expect(qty(t, 0)).toBe(37)
    expect(t[1]).toEqual({ archetype: 'pest', rarity: 'rare', activity: 15, quantity: 37 })
  })
  it('9 Brain Fog Tincture', () => {
    const t = board(m('agito', 'normal'))
    run(9, t)
    expect(t[0]).toMatchObject({ rarity: 'rare', activity: 162 })
  })
  it('10 Osteogenic Powder', () => {
    const t = board(m('boneSentry', 'normal'), m('aemberon', 'normal'))
    run(10, t)
    expect(qty(t, 0)).toBe(203)
    expect(t[1]).toBeNull()
  })
  it('11 Gray Matter Spinal Solution', () => {
    const t = board(m('aemberon', 'magic'))
    const { events } = run(11, t)
    expect(t[0]).toMatchObject({ archetype: 'aemberon', activity: 76 })
    expect(events.filter(e => e.type === 'mutate')).toHaveLength(2)
  })
  it('12 Hollow Spinal Solution', () => {
    const t = board(m('pest', 'magic')); run(12, t, [0], stubRng([0]))
    expect(t[0]).toMatchObject({ archetype: 'aemberon', activity: 46 })
    const u = board(m('pest', 'magic')); run(12, u, [0], stubRng([0.99]))
    expect(u[0]).toMatchObject({ archetype: 'pest', rarity: 'magic', activity: 46 })
  })
  it('13 Green Bile Solution', () => {
    const t = board(m('pest', 'normal')); run(13, t, [0])
    expect(t[0]).toMatchObject({ rarity: 'magic', activity: 32 })
  })
  it('14 Compound Leech Solution', () => {
    const t = board(m('aemberon', 'magic'), m('pest', 'magic'), m('boneSentry', 'normal')); run(14, t, [0])
    expect([act(t, 0), act(t, 1), act(t, 2)]).toEqual([36, 36, 1])
  })
  it('15 Digestive Enzyme Solution', () => {
    const t = board(m('aemberon', 'normal'), m('pest', 'normal')); run(15, t, [1])
    expect(act(t, 1)).toBe(62); expect(t[0]).toBeNull()
  })
  it('16 Vital Breeding Powder', () => {
    const t = board(m('aemberon', 'normal'), m('pest', 'magic'), m('boneSentry', 'rare'), m('agito', 'boss'), m('aemberon', 'normal'))
    run(16, t)
    expect([0, 1, 2, 3, 4].map(i => qty(t, i))).toEqual([68, 56, 44, 33, 36])
  })
  it('17 Potent Purging Powder', () => {
    const t = board(m('pest', 'normal'), m('aemberon', 'normal'), m('boneSentry', 'normal'), m('pest', 'normal')); run(17, t, [0])
    expect(qty(t, 0)).toBe(190); expect(t[1]).toBeNull(); expect(t[2]).toBeNull(); expect(t[3]).not.toBeNull()
  })
  it('18 Purging Powder', () => {
    const t = board(m('pest', 'normal'), m('aemberon', 'normal'), m('boneSentry', 'normal')); run(18, t, [0])
    expect(qty(t, 0)).toBe(163)
    expect([t[1], t[2]].filter(x => x === null)).toHaveLength(1)
  })
  it('19 Pure Leech Solution', () => {
    const t = board(m('pest', 'normal'), m('pest', 'normal'), m('aemberon', 'normal')); run(19, t, [0])
    expect([act(t, 0), act(t, 1), act(t, 2)]).toEqual([32, 32, 1])
  })
  it('20 Bewitching Tincture', () => {
    const t = board(m('aemberon', 'normal')); run(20, t, [0])
    expect(t[0]).toMatchObject({ rarity: 'magic', activity: 61 })
    const u = board(m('aemberon', 'boss')); run(20, u, [0])
    expect(u[0]).toMatchObject({ rarity: 'boss', activity: 420 })
  })
  it('21 Mutagenic Powder', () => {
    const t = board(m('aemberon', 'normal'), m('pest', 'normal')); run(21, t, [0, 1])
    for (const i of [0, 1]) expect(t[i]).toMatchObject({ rarity: 'rare', quantity: 88 })
  })
  it('22 Viscous Bile Solution', () => {
    const t = board(m('aemberon', 'rare'), null, m('pest', 'normal')); run(22, t, [0])
    expect(act(t, 0)).toBe(46)
    expect(t[2]).toEqual({ archetype: 'aemberon', rarity: 'rare', activity: 32, quantity: 36 })
  })
})

describe('normal potions', () => {
  it('23 / 27 Slender Limb Powder', () => {
    const t = board(); run(23, t); expect(t[0]).toEqual({ archetype: 'pest', rarity: 'normal', activity: 1, quantity: 109 })
    const u = board(); run(27, u); expect(u[0]).toEqual({ archetype: 'boneSentry', rarity: 'normal', activity: 1, quantity: 109 })
  })
  it('24 Twin Hormone - Pest', () => {
    const t = board(m('aemberon', 'rare')); run(24, t, [0])
    expect(t[0]).toEqual({ archetype: 'pest', rarity: 'normal', activity: 15, quantity: 12 })
    expect(t[1]).toEqual(m('pest', 'normal'))
  })
  it('25 / 30 Spinal Solution', () => {
    const t = board(); run(25, t); expect(t[0]).toEqual({ archetype: 'agito', rarity: 'normal', activity: 32, quantity: 36 })
    const u = board(); run(30, u); expect(u[0]).toEqual({ archetype: 'aemberon', rarity: 'normal', activity: 32, quantity: 36 })
  })
  it('26 Anesthetic Tincture - Agito', () => {
    const t = board(m('pest', 'normal')); run(26, t, [0])
    expect(t[0]).toMatchObject({ archetype: 'agito', rarity: 'magic', activity: 61 })
  })
  it('28 Twin Hormone - Bone Sentry', () => {
    const t = board(m('pest', 'normal')); run(28, t, [0])
    expect(t[0]).toMatchObject({ archetype: 'boneSentry', quantity: 98 })
  })
  it('29 Anesthetic Tincture - Aemberon', () => {
    const t = board(m('pest', 'normal'), m('boneSentry', 'normal')); run(29, t, [0])
    expect([t[0]!.archetype, t[1]!.archetype]).toEqual(['aemberon', 'aemberon'])
  })
  it('31 Xeno-Hormone', () => {
    const t = board(m('pest', 'normal'), m('boneSentry', 'normal')); run(31, t, [0, 1])
    for (const i of [0, 1, 2, 3]) expect(t[i]).toEqual({ archetype: 'pest', rarity: 'normal', activity: 6, quantity: 36 })
    expect(t[4]).toBeNull()
  })
  it('32 Targeted Xeno-Hormone', () => {
    const t = board(m('pest', 'normal')); run(32, t, [0])
    for (const i of [0, 1]) expect(t[i]).toEqual({ archetype: 'pest', rarity: 'magic', activity: 5, quantity: 49 })
  })
})

describe('supreme potions', () => {
  it('35 Compound Revitalizing Pill', () => {
    const t = board(m('pest', 'magic'), m('boneSentry', 'rare')); run(35, t, [], stubRng([rollFor('magic')]))
    expect(t[0]).toEqual({ archetype: 'aemberon', rarity: 'magic', activity: 27, quantity: 24 })
    expect(t[1]).toEqual({ archetype: 'aemberon', rarity: 'magic', activity: 37, quantity: 12 })
    const u = board(m('pest', 'magic'), m('boneSentry', 'rare')); run(35, u, [], stubRng([rollFor('boss')]))
    expect(u[0]).toMatchObject({ rarity: 'boss', activity: 16, quantity: 35 })
    expect(u[1]).toMatchObject({ rarity: 'boss', activity: 26, quantity: 23 })
  })
  it('36 Fast-Acting Heart Tonic', () => {
    const t = board(m('pest', 'normal'), m('boneSentry', 'rare')); run(36, t)
    expect(t[0]).toMatchObject({ activity: 43, quantity: 78 })
  })
  it('37 Plague Quarter Peat Poultice', () => {
    const t = board(m('boneSentry', 'normal'), m('pest', 'normal'), m('aemberon', 'normal')); run(37, t)
    expect(t[1]).toBeNull(); expect(t[2]).toBeNull()
    expect(t[0]).toMatchObject({ activity: 41, quantity: 114 })
  })
  it('38 Insect Lure', () => {
    const t = board(...Array.from({ length: 4 }, () => m('pest', 'normal')))
    const { events } = run(38, t)
    for (let i = 0; i < 6; i++) expect(t[i]).toEqual({ archetype: 'pest', rarity: 'normal', activity: 21, quantity: 66 })
    expect(events.filter(e => e.type === 'addOverflow')).toHaveLength(2)
  })
  it('41 Rousing Salts: +111 Activity and +111 Quantity to one random group', () => {
    const t = board(m('pest', 'normal'), m('boneSentry', 'rare'), m('agito', 'magic'))
    run(41, t, [], stubRng([0.5]))
    expect(t[1]).toMatchObject({ activity: 126, quantity: 123 })
    expect(t[0]).toMatchObject({ activity: 1, quantity: 36 })
    expect(t[2]).toMatchObject({ activity: 5, quantity: 24 })
  })
  it('39 Purest Holy Water', () => {
    const t = board(m('agito', 'normal'), m('agito', 'boss'), m('agito', 'magic')); run(39, t)
    expect(t[0]).toMatchObject({ rarity: 'rare', activity: 121 })
    expect(t[1]).toMatchObject({ rarity: 'boss', activity: 420 })
    expect(t[2]).toMatchObject({ rarity: 'boss', activity: 125 })
  })
})

describe('pools', () => {
  it('has 42 potions (ids 0–41); boxes have no effect, others do', () => {
    expect(POTIONS).toHaveLength(42)
    for (const p of POTIONS) {
      const isBox = typeof p.targeting === 'object'
      expect(!!p.effect).toBe(!isBox)
    }
  })
  it('BOX_POOL excludes boxes and supremes; SUPREME_POOL is 35–39 and 41; NORMAL_POOL has boxes, no supremes', () => {
    expect(BOX_POOL.some(p => typeof p.targeting === 'object' || p.rarity === 'supreme')).toBe(false)
    expect(SUPREME_POOL.map(p => p.id)).toEqual([35, 36, 37, 38, 39, 41])
    expect(NORMAL_POOL.some(p => p.rarity === 'supreme')).toBe(false)
    expect(NORMAL_POOL.filter(p => typeof p.targeting === 'object').map(p => p.id).sort()).toEqual([33, 34, 40])
  })
})

describe('review fixes', () => {
  it('A4: targeted potions do nothing on an empty board (#31, #32)', () => {
    for (const id of [31, 32]) {
      const t = board()
      run(id, t, [])
      expect(t.every(x => x === null)).toBe(true)
    }
  })
  it('awaken never lowers rarity: Brain Fog on a Boss Agito keeps Boss', () => {
    const t = board(m('agito', 'boss'))
    run(9, t)
    expect(t[0]).toMatchObject({ rarity: 'boss', activity: 461 })
  })
})

describe('names and wording confirmed from the English client', () => {
  it('uses the official names', () => {
    expect(potion(3).name).toBe('Osteolytic Ointment')
    expect(potion(13).name).toBe('Green Bile Solution')
    expect(potion(17).name).toBe('Potent Xenopurge Powder')
    expect(potion(18).name).toBe('Xenopurge Powder')
  })
  it('uses the in-game wording', () => {
    expect(potion(3).text).toMatch(/^When you have at least 1 group\(s\) of \{BoneSentry\}s, \{remove\} up to 3 group\(s\) of monsters that are not \{BoneSentry\}s/)
    expect(potion(13).text).toBe('Select 1-2 groups of monsters, {mutate} them into random Magic monsters, and +31 to their {act}Activity')
    expect(potion(17).text).toMatch(/^Select 1 group\(s\) of monsters and \+154 to their \{qty\}Quantity, then \{remove\} 2 group\(s\) of monsters of different/)
  })
})

describe('more names confirmed from the English client', () => {
  it('potions', () => {
    expect(potion(7).name).toBe('Viviparous Hormone')
    expect(potion(23).name).toBe('Slender-Limb Powder - Pest')
    expect(potion(27).name).toBe('Slender-Limb Powder - Bone Sentry')
    expect(potion(38).name).toBe('Insect Attractant')
    expect(potion(40).name).toBe('Rare Potion Kit (Small)')
    expect(potion(7).text).toBe('{add} 1 group(s) of {Pest}s. 50% chance to {add} 2 additional group(s)')
    expect(potion(25).text).toBe('{add} 1 group(s) of {Agito}s and +31 to their {act}Activity')
  })
})

it('Vivigenic Powder is the official name for 活殖药粉', () => {
  expect(potion(16).name).toBe('Vivigenic Powder')
})

it('uses the in-game name Slough Solution for the Pest-fusing rare potion', () => {
  expect(POTIONS.find(p => p.id === 1)?.name).toBe('Slough Solution')
})

it('uses the in-game name Compound Leech Solution for the same-rarity leech potion', () => {
  expect(POTIONS.find(p => p.id === 14)?.name).toBe('Compound Leech Solution')
})

it('uses the in-game names seen on live screenshots (2026-10-18)', () => {
  const name = (id: number) => POTIONS.find(p => p.id === id)?.name
  expect(name(2)).toBe('Leptomeningeal Solution')
  expect(name(4)).toBe('Cleansing Ointment')
  expect(name(33)).toBe('Potion Kit (Large)')
})

it('uses the in-game name Plague Quarter Peat Poultice for the Bone Sentry ULT potion', () => {
  expect(POTIONS.find(p => p.id === 37)?.name).toBe('Plague Quarter Peat Poultice')
})

it('spells Vivigenic Powder as the game does', () => {
  expect(POTIONS.some(p => p.name === 'Vivigenic Powder')).toBe(true)
})

it('uses the in-game name Potion Kit (Small) for the plain 3-potion kit', () => {
  expect(POTIONS.find(p => p.id === 34)?.name).toBe('Potion Kit (Small)')
})

it('uses the in-game name Probiotic Enzyme Solution for the Pest-counting rare potion', () => {
  expect(POTIONS.find(p => p.id === 0)?.name).toBe('Probiotic Enzyme Solution')
})

it('uses the in-game name Compound Revitalizing Pill (seen on a live Supreme offer)', () => {
  expect(POTIONS.find(p => p.id === 35)?.name).toBe('Compound Revitalizing Pill')
})
