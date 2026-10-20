import { cardChanges } from '@/engine/game'
import { toState } from '@/strategy/advisor'

const m = (archetype: string, rarity = 'normal') => ({ archetype, rarity, activity: 10, quantity: 100 }) as never
const full = [m('pest'), m('pest'), m('agito'), m('agito'), m('boneSentry'), m('aemberon', 'magic')]
const at = (tanks: unknown[], hand: string[], instruments: string[] = ['Incubation Sac']) =>
  toState({ tanks: tanks as never, hand, instruments, phase: 'potion', round: 4, potionRefreshes: 0 }, [])

describe('whether a card changes the board (its own effect, before the round ends)', () => {
  it('a card that only adds a monster does nothing when the tanks are full', () => {
    expect(cardChanges(at(full, ['Spinal Solution - Aemberon']), 0, [])).toBe(false)
  })
  it('the same card with a tank free adds it', () => {
    expect(cardChanges(at([...full.slice(0, 5), null], ['Spinal Solution - Aemberon']), 0, [])).toBe(true)
  })
  it('a card that mutates still changes a full board (its add fails, the mutation doesn’t)', () => {
    expect(cardChanges(at(full, ['Twin Hormone - Pest']), 0, [2])).toBe(true)
  })
  it('an add that overflows counts when an instrument rewards it (Two-Inch Skull Nail)', () => {
    expect(cardChanges(at(full, ['Spinal Solution - Aemberon'], ['Two-Inch Skull Nail']), 0, [])).toBe(true)
  })
})

describe('the advice on a full board', () => {
  it('says when a move does nothing, and prefers one that does something when they’re about equal', async () => {
    const { markNoEffect } = await import('@/strategy/advisor')
    const s = at(full, ['Spinal Solution - Aemberon', 'Twin Hormone - Pest'])
    const ranking = markNoEffect(s, [{ index: 0, targets: [], value: 1000 }, { index: 1, targets: [2], value: 995 }])
    expect(ranking.map(r => [r.index, !!r.noEffect])).toEqual([[1, false], [0, true]])
  })
  it('keeps a do-nothing move first when it’s clearly better (every other card hurts)', async () => {
    const { markNoEffect } = await import('@/strategy/advisor')
    const s = at(full, ['Spinal Solution - Aemberon', 'Twin Hormone - Pest'])
    expect(markNoEffect(s, [{ index: 0, targets: [], value: 1000 }, { index: 1, targets: [2], value: 900 }])[0]).toMatchObject({ index: 0, noEffect: true })
  })
  it('the move in words says so', async () => {
    const { describe: say } = await import('@/solver/advice/describe')
    const board = { tanks: full, hand: ['Spinal Solution - Aemberon'], instruments: [], phase: 'potion' as const, round: 4 }
    expect(say({ index: 0, targets: [], value: 1, noEffect: true }, board, true)).toBe('Play Spinal Solution - Aemberon (card 1): does nothing, the tanks are full')
  })
})
