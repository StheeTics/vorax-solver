import { toState } from '@/strategy/advisor'
import SHIPPED from '@/data/boardValue.json'
import { boardValue, features, FEATURE_NAMES, hasBoardValue, setBoardValue, treeFeatures, TREE_FEATURES, useShippedBoardValue, type ValueModel } from '@/strategy/value'
import { evChooser } from '@/strategy/bot'
import { ultimateActivity } from '@/engine/game'

// live game (Vorax Overlay, 2026-10-18), round 3: Incubation Sac with one Pest; a card that adds a Pest is in the hand
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

/** A model that values only one feature, in every round. */
const only = (name: string, weight: number): ValueModel => {
  const w = FEATURE_NAMES.map(n => (n === name ? weight : 0))
  return { rounds: Array.from({ length: 13 }, () => w) }
}
afterEach(() => useShippedBoardValue())

describe('a board described for the board value', () => {
  it('has a number for every named feature', () => {
    expect(features(incubation)).toHaveLength(FEATURE_NAMES.length)
  })
  it('says how many Pests an owned Incubation Sac has to work with, and nothing for instruments not owned', () => {
    const x = features(incubation)
    expect(x[FEATURE_NAMES.indexOf('Incubation Sac × pest')]).toBeCloseTo(1 / 6)
    expect(x[FEATURE_NAMES.indexOf('Clustered Eggs × pest')]).toBe(0)
  })
})

describe('the board value', () => {
  it('is the model’s prediction of the final score, counted up to 900,000', () => {
    setBoardValue(only('bias', 0.5))
    expect(boardValue(incubation)).toBe(500_000)
    setBoardValue(only('bias', 2))
    expect(boardValue(incubation)).toBe(900_000)
  })
  it('is the score itself once the game is over', () => {
    setBoardValue(only('bias', 0.5))
    expect(boardValue({ ...incubation, phase: 'gameOver' })).toBe(ultimateActivity(incubation))
  })
  it('without a model, is the score', () => {
    setBoardValue(null)
    expect(boardValue(incubation)).toBe(ultimateActivity(incubation))
  })
  it('the Solver uses the board value it ships with (src/data/boardValue.json): a prediction, not the score', () => {
    expect(hasBoardValue()).toBe(true)
    expect(boardValue(incubation)).toBeGreaterThan(10 * ultimateActivity(incubation))
  })
})

it('a player judging by the board value plays toward what it rewards (here, Pests beside Incubation Sac)', () => {
  setBoardValue(only('Incubation Sac × pest', 3))
  const r = evChooser({ samples: 2, horizon: 0, value: true })(incubation, 1)
  expect(incubation.hand[(r.best[0] as { index: number }).index].id).toBe(23)
})

describe('instrument pairs', () => {
  it('a board says which pairs of instruments it holds', () => {
    const both = { ...incubation, instruments: [...incubation.instruments, { id: 9, acquiredRound: 2 }] }
    expect(features(both)[FEATURE_NAMES.indexOf('Incubation Sac + Clustered Eggs')]).toBe(1)
    expect(features(incubation)[FEATURE_NAMES.indexOf('Incubation Sac + Clustered Eggs')]).toBe(0)
  })
  it('a model from before the pairs (fewer weights) still works on the boards described with them', () => {
    const w = FEATURE_NAMES.map(n => (n === 'bias' ? 0.5 : 0)).slice(0, FEATURE_NAMES.indexOf('Incubation Sac + Clustered Eggs') - 5)
    setBoardValue({ rounds: Array.from({ length: 13 }, () => w) })
    expect(boardValue(incubation)).toBe(500_000)
  })
})

describe('a board value made of decision trees', () => {
  it('describes the board in raw numbers, with archetype and rarity together (a Rare Agito is visible)', () => {
    const x = treeFeatures({ ...incubation, tanks: [{ archetype: 'agito', rarity: 'rare', activity: 15, quantity: 12 }, null, null, null, null, null] })
    expect(x).toHaveLength(TREE_FEATURES.length)
    expect(x[TREE_FEATURES.indexOf('rare agito')]).toBe(1)
    expect(x[TREE_FEATURES.indexOf('magic pest')]).toBe(0)
  })
  it('adds up its trees’ answers: a question per branch, an amount per leaf', () => {
    // one tree: own Incubation Sac? yes → +0.3, no → −0.1 (in millions), on top of 0.5
    const sac = TREE_FEATURES.indexOf('Incubation Sac')
    setBoardValue({ base: 0.5, trees: [{ f: [sac, -1, -1], t: [0.5, 0, 0], l: [1, -1, -1], r: [2, -1, -1], v: [0, -0.1, 0.3] }] })
    expect(boardValue(incubation)).toBe(800_000)
    expect(boardValue({ ...incubation, instruments: [] })).toBe(400_000)
  })
})

it('the board value counts only what a board has (the instruments it owns, their pairs), with the same result as every feature', () => {
  const boards = [
    incubation,
    { ...incubation, instruments: [{ id: 2, acquiredRound: 1 }, { id: 9, acquiredRound: 2 }, { id: 19, acquiredRound: 3 }], round: 6 },
    { ...incubation, instruments: [], round: 1, phase: 'instrumentSelect' as const },
    { ...incubation, instruments: [{ id: 25, acquiredRound: 1 }, { id: 14, acquiredRound: 4 }], round: 11, phase: 'roundEnd' as const },
  ]
  for (const b of boards) {
    const x = features(b)
    const w = (SHIPPED as ValueModel & { rounds: number[][] }).rounds[b.round - 1]
    const dot = Math.max(0, Math.min(900_000, w.reduce((t, wi, i) => t + wi * x[i], 0) * 1e6))
    expect(boardValue(b)).toBeCloseTo(dot, 3)
  }
})
