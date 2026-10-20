import { toState } from '@/strategy/advisor'
import { planChooser, options } from '@/strategy/bot'

// live game test-3440-8, round 2: Adherent Metatarsals needs at least 2 Bone Sentries (tanks 1 and 3)
const metatarsals = toState({
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
}, [])

describe('potions judged by how the whole run ends', () => {
  const choice = planChooser({ top: 4, playouts: 32 })(metatarsals, 1)

  it('picks one of the options on offer, or a reroll', () => {
    expect([...options(metatarsals), [{ type: 'refresh' }]].map(o => JSON.stringify(o))).toContain(JSON.stringify(choice.best))
  })

  it('does not turn one of the two Bone Sentries Adherent Metatarsals needs into something else', () => {
    const targets = choice.best.flatMap(a => (a.type === 'toggleTarget' ? [a.tank] : []))
    const card = choice.best[0].type === 'selectCard' ? metatarsals.hand[choice.best[0].index].id : -1
    const mutatesAway = [26, 29].includes(card) && targets.some(t => t === 0 || t === 2)
    expect(mutatesAway).toBe(false)
  })
})

// live game (Vorax Overlay, 2026-10-18), round 3: Incubation Sac wants 2 Pests; the hand has one mutation
// card that scores best this round and two cards that add a monster
const incubation = toState({
  tanks: [
    { archetype: 'boneSentry', rarity: 'normal', activity: 1, quantity: 36 },
    { archetype: 'boneSentry', rarity: 'normal', activity: 32, quantity: 36 },
    { archetype: 'boneSentry', rarity: 'normal', activity: 32, quantity: 36 },
    { archetype: 'pest', rarity: 'magic', activity: 5, quantity: 97 },
    null, null,
  ],
  hand: ['Petrified Spinal Solution', 'Spinal Solution - Aemberon', 'Spinal Solution - Agito'],
  instruments: ['Incubation Sac'],
  phase: 'potion',
  round: 3,
  potionRefreshes: 3,
}, [])

describe('what the look-ahead plays to the end of the run', () => {
  const isRefresh = (a: { o: { type: string }[] }) => a.o[0].type === 'refresh'
  it('every card on offer, not only the one that scores best this round', async () => {
    const { lookAhead } = await import('@/strategy/bot')
    const cards = new Set(lookAhead(incubation, 1, { top: 4, playouts: 2 }).filter(a => !isRefresh(a)).map(a => (a.o[0] as { index: number }).index))
    expect([...cards].sort()).toEqual([0, 1, 2])
  })
  it('a reroll, while rerolls are left', async () => {
    const { lookAhead } = await import('@/strategy/bot')
    expect(lookAhead(incubation, 1, { top: 4, playouts: 2 }).some(isRefresh)).toBe(true)
    expect(lookAhead({ ...incubation, potionRefreshes: 0 }, 1, { top: 4, playouts: 2 }).some(isRefresh)).toBe(false)
  })
})

it('successive halving still ranks every option, the most-played ones first', async () => {
  const { lookAhead } = await import('@/strategy/bot')
  const plain = lookAhead(incubation, 1, { top: 4, playouts: 2 })
  const halved = lookAhead(incubation, 1, { top: 4, playouts: 2, halving: true })
  expect(halved).toHaveLength(plain.length)
})

describe('futures split into slices (one per CPU core) give the same answer as all in one go', () => {
  const add = (a: { goal: number; reached: number; n: number }[], b: typeof a) => a.map((x, i) => ({ goal: x.goal + b[i].goal, reached: x.reached + b[i].reached, n: x.n + b[i].n }))
  it('potions', async () => {
    const { shortlist, potionFutures } = await import('@/strategy/bot')
    const la = { top: 4, playouts: 4, steer: 0.3 }
    const opts = shortlist(incubation, 1, la).map(c => c.o)
    expect(add(potionFutures(incubation, 1, la, opts, 0, 1), potionFutures(incubation, 1, la, opts, 1, 4))).toEqual(potionFutures(incubation, 1, la, opts, 0, 4))
  })
  it('instruments', async () => {
    const { instrumentFutures, rankInstruments, evChooser } = await import('@/strategy/bot')
    const offer = toState({ tanks: incubation.tanks, hand: ['Clustered Eggs', 'Sinew Garrote', 'Pig Iron Bone Saw'], instruments: ['Incubation Sac'], phase: 'instrument', round: 3, instrumentRefreshes: 2 }, [])
    const policy = { samples: 1, horizon: 0 }
    const choices = [0, 1, 2, 'refresh'] as const
    const split = add(instrumentFutures(offer, 1, [...choices], evChooser(policy), 'target', 0, 1), instrumentFutures(offer, 1, [...choices], evChooser(policy), 'target', 1, 3))
    const whole = rankInstruments(offer, 1, 3, evChooser(policy), 'target')
    expect(split.slice(0, 3).map(t => t.goal / t.n)).toEqual(whole.offers)
    expect(split[3].goal / split[3].n).toEqual(whole.refresh)
  })
})
