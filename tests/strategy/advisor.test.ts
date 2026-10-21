import { advise, INSTRUMENT_FUTURES, LOOK_AHEAD, names, toState, type ScreenState } from '@/strategy/advisor'
import { DEFAULT_SETTINGS } from '@/engine/game'
import { settingsForShelley } from '@/data/shelley'

const tank = { archetype: 'pest' as const, rarity: 'magic' as const, activity: 81, quantity: 340 }
const board: ScreenState = {
  tanks: Array.from({ length: 6 }, () => ({ ...tank })),
  hand: ['Mutagenic Powder', 'Green Bile Solution', 'Bewitching Tincture'],
  instruments: [],
  phase: 'potion',
  round: 9,
}

it('advise ranks a potion hand', () => {
  const a = advise(board)
  expect(a.ranking.length).toBeGreaterThan(0)
  expect(a.unknown).toEqual([])
  expect(a.best).toBeDefined()
})

it('the Shelley level picks the settings', () => {
  expect(toState({ ...board, shelley: 1 }, []).settings).toEqual(settingsForShelley(1))
  expect(toState(board, []).settings).toEqual(DEFAULT_SETTINGS)
})

it('unknown names are reported', () => {
  expect(advise({ ...board, hand: ['Not A Card'] }).unknown).toEqual(['Not A Card'])
})

it('a Surgical Protocol pick gets no ranking: it does not change Ultimate Activity', () => {
  const a = advise({ ...board, phase: 'protocol', hand: ['Laser Amputation', 'Laparolithotomy', 'Trepanation'] })
  expect(a.ranking).toEqual([])
  expect(a.unknown).toEqual([])
})

describe('a Xenopanacea on offer', () => {
  it('is always the advice, whatever else is offered', () => {
    const a = advise({ ...board, phase: 'potion', hand: ['Mutagenic Powder', 'Xenopanacea: Brood', 'Bewitching Tincture'] }, 2)
    expect(a.best).toEqual(expect.objectContaining({ index: 1 }))
    expect(a.unknown).toEqual([])
  })
  it('counts an unseen variant too', () => {
    const a = advise({ ...board, phase: 'potion', hand: ['Xenopanacea', 'Mutagenic Powder'] }, 2)
    expect(a.best).toEqual(expect.objectContaining({ index: 0 }))
  })
  it('is a potion name the Solver accepts (dropdowns and shared boards)', () => {
    expect(names().potions).toEqual(expect.arrayContaining(['Xenopanacea: Osteotrophy', 'Xenopanacea: Brood', 'Xenopanacea']))
  })
})

it('it keeps the board the build needs (live game: Adherent Metatarsals, round 2)', () => {
  // turning tank 1 (index 0) or tank 2 (index 1) into an Agito scores the same this round, but tank 1 is one of the
  // two Bone Sentries Adherent Metatarsals needs. Judged as the live Solver judges (the look-ahead, the smarter player):
  // the quick this-round advice's tie-break flipped when the odds changed (2026-10-20) and stopped the hourly data pull
  const a = advise({
    tanks: [
      { archetype: 'boneSentry', rarity: 'magic', activity: 32, quantity: 36 },
      { archetype: 'aemberon', rarity: 'magic', activity: 32, quantity: 36 },
      { archetype: 'boneSentry', rarity: 'magic', activity: 5, quantity: 24 },
      null, null, null,
    ],
    hand: ['Anesthetic Tincture - Agito', 'Anesthetic Tincture - Aemberon', 'Twin Hormone - Pest'],
    instruments: ['Adherent Metatarsals'],
    phase: 'potion',
    round: 2,
    potionRefreshes: 3,
  }, 16, true)
  // no Agito tincture on either Bone Sentry
  const best = a.best as { index: number; targets: number[] }
  expect(best.index === 0 && best.targets.some(t => t === 0 || t === 2)).toBe(false)
})

it('with look-ahead, each potion option predicts the end of the run', () => {
  const a = advise(board, 16, true)
  expect(a.plan).toBe(true)
  for (const r of a.ranking) {
    expect(r.end!.activity).toBeGreaterThan(0)
    expect(r.end!.activity).toBeLessThanOrEqual(950_000)
    expect(r.end!.reached).toBeGreaterThanOrEqual(0)
    expect(r.end!.reached).toBeLessThanOrEqual(1)
  }
})

it('with look-ahead, a reroll is weighed like the cards and its prediction is given', () => {
  const a = advise({ ...board, potionRefreshes: 2 }, 16, true)
  expect(a.refreshEnd!.activity).toBeGreaterThan(0)
  expect(a.ranking.every(r => r.end)).toBe(true)
})

describe('a Holy Water rite on offer (issue #13)', () => {
  it('is always the advice, like a Xenopanacea: its effect is a card the simulator doesn\'t know', () => {
    const a = advise({ ...board, phase: 'potion', hand: ['Mutagenic Powder', 'Bewitching Tincture', 'First Rite Holy Water: Confession'] }, 2)
    expect(a.best).toEqual(expect.objectContaining({ index: 2 }))
    expect(a.note).toMatch(/First Rite Holy Water: Confession: always take it/)
    expect(a.unknown).toEqual([])
    expect(names().potions).toEqual(expect.arrayContaining(['First Rite Holy Water: Confession', 'Ritual Holy Water: Flagellation']))
  })
  it('but Purest Holy Water is simulated, and weighed like any card', async () => {
    const { isAlwaysTake } = await import('@/data/xenopanacea')
    expect(isAlwaysTake('Purest Holy Water')).toBe(false)
    expect(isAlwaysTake('Ritual Holy Water: Flagellation')).toBe(true)
  })
})

describe('a Potion Kit on offer is always taken before a refresh', () => {
  // live game 936e23ff (2026-10-19), round 3: the look-ahead rated a refresh (600k) above the kit (515k)
  const board: ScreenState = {
    tanks: [{ archetype: 'aemberon', rarity: 'magic', activity: 5, quantity: 56 }, { archetype: 'boneSentry', rarity: 'magic', activity: 5, quantity: 40 }, { archetype: 'pest', rarity: 'magic', activity: 300, quantity: 9 }, { archetype: 'pest', rarity: 'magic', activity: 5, quantity: 40 }, { archetype: 'pest', rarity: 'magic', activity: 5, quantity: 32 }, null],
    hand: ['Rare Potion Kit (Small)', 'Leptomeningeal Solution', 'Spinal Solution - Aemberon'],
    instruments: ['Aberrant Sprout'], phase: 'potion', round: 3, potionRefreshes: 3,
  }
  // the rule is the kit over a refresh: another card can still be better than both, as the odds change
  it('with the look-ahead: not a refresh', () => {
    const a = advise(board, 16, true)
    expect(a.best).not.toBe('refresh')
  })
  it('for this round alone too', () => {
    const a = advise(board)
    expect(a.best).not.toBe('refresh')
  })
  it('without a kit on offer, a refresh can still be advised', () => {
    const a = advise({ ...board, hand: ['Leptomeningeal Solution', 'Spinal Solution - Aemberon'] }, 16, true)
    expect(['refresh', 0, 1]).toContain(a.best === 'refresh' ? 'refresh' : a.best!.index)
  })
})

describe('the game rebuilt from the screen', () => {
  const offer = (instruments: string[]): ScreenState => ({ ...board, phase: 'instrument', hand: ['Clustered Eggs', 'Sinew Garrote', 'Pig Iron Bone Saw'], instruments })
  it('at the 2nd instrument offer, the 8,000 reward is the one on screen: no 3rd instrument at the end of the round', () => {
    expect(toState(offer(['Incubation Sac']), []).thresholds).toEqual({ t8000: true, t28000: false })
  })
  it('at the 3rd instrument offer, both rewards are used', () => {
    expect(toState(offer(['Incubation Sac', 'Sinew Garrote']), []).thresholds).toEqual({ t8000: true, t28000: true })
  })
  it('with 1 instrument while choosing a potion, the 8,000 reward is still to come', () => {
    expect(toState({ ...board, instruments: ['Incubation Sac'] }, []).thresholds).toEqual({ t8000: false, t28000: false })
  })
  it('each instrument keeps the round it was picked in (Lady of the Plague Quarter fires every 2 rounds from then)', () => {
    const s = toState({ ...board, instruments: ['Incubation Sac', 'Lady of the Plague Quarter'], instrumentRounds: [1, 4] }, [])
    expect(s.instruments.map(i => i.acquiredRound)).toEqual([1, 4])
  })
  it('a pick round not known counts as round 1', () => {
    expect(toState({ ...board, instruments: ['Incubation Sac'] }, []).instruments[0].acquiredRound).toBe(1)
  })
})

it('an unreadable card: the advice still names the card by its place on screen', () => {
  const hand = ['Mutagenic Powder', 'Green Bile Solution', 'Bewitching Tincture']
  const known = advise({ ...board, hand }, 4)
  const withUnknown = advise({ ...board, hand: ['Not A Card', ...hand] }, 4)
  const named = (a: typeof known, h: string[]) => a.ranking.map(r => h[r.index])
  expect(named(withUnknown, ['Not A Card', ...hand])).toEqual(named(known, hand))
})

it('instrument choices are judged by the final score counted up to 950,000, like potions', () => {
  // a board already far past 950,000: uncapped, every choice would be worth more
  const big = { archetype: 'agito' as const, rarity: 'boss' as const, activity: 2000, quantity: 600 }
  const a = advise({ ...board, tanks: Array.from({ length: 6 }, () => ({ ...big })), phase: 'instrument', hand: ['Clustered Eggs', 'Sinew Garrote', 'Pig Iron Bone Saw'], instruments: ['Incubation Sac'], round: 9, instrumentRefreshes: 0 })
  expect(a.ranking.map(r => r.value)).toEqual([950_000, 950_000, 950_000])
})

it('the advice’s futures are played by the smarter player (the board value), with 64 futures for potions and instruments', () => {
  expect(LOOK_AHEAD).toMatchObject({ playouts: 64, value: true })
  expect(INSTRUMENT_FUTURES).toBe(64)
})
