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

  it('picks one of the options on offer', () => {
    expect(options(metatarsals).map(o => JSON.stringify(o))).toContain(JSON.stringify(choice.best))
  })

  it('does not turn one of the two Bone Sentries Adherent Metatarsals needs into something else', () => {
    const targets = choice.best.flatMap(a => (a.type === 'toggleTarget' ? [a.tank] : []))
    const card = choice.best[0].type === 'selectCard' ? metatarsals.hand[choice.best[0].index].id : -1
    const mutatesAway = [26, 29].includes(card) && targets.some(t => t === 0 || t === 2)
    expect(mutatesAway).toBe(false)
  })
})
