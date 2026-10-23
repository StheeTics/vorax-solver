import { cloneState, createGame, dispatch, DEFAULT_SETTINGS, canConfirm, canRefresh, needsTargets, ultimateActivity } from '@/engine/game'
import { dealPotions } from '@/engine/draw'
import { createRng } from '@/engine/rng'
import { potion } from '@/data/potions'
import type { Action, GameState, SandboxSetup } from '@/engine/types'
import { board, m } from '../helpers'

const sandbox = (over: Partial<SandboxSetup> = {}): SandboxSetup => ({
  tanks: board(m('pest', 'normal'), m('agito', 'normal')),
  instruments: [{ id: 1, acquiredRound: 1 }],
  startRound: 1,
  thresholdsUsed: { t8000: false, t28000: false },
  forcedHand: [],
  seed: 5,
  ...over,
})
const play = (s: GameState, ...actions: Action[]) => actions.reduce((st, a) => dispatch(st, a).state, s)

it('new game starts with a basic instrument pick and 3–4 monsters', () => {
  const s = createGame(DEFAULT_SETTINGS, undefined, 1)
  expect(s.phase).toBe('instrumentSelect')
  expect(s.hand).toHaveLength(3)
  for (const c of s.hand) { expect(c.kind).toBe('instrument'); expect(c.id).toBeGreaterThanOrEqual(1); expect(c.id).toBeLessThanOrEqual(8) }
  const n = s.tanks.filter(Boolean).length
  expect(n).toBeGreaterThanOrEqual(3); expect(n).toBeLessThanOrEqual(4)
  expect(s.potionRefreshes).toBe(3); expect(s.instrumentRefreshes).toBe(2)
})

it('picking the basic instrument moves to the round-1 potion hand', () => {
  const s = createGame(DEFAULT_SETTINGS, undefined, 1)
  const t = play(s, { type: 'selectCard', index: 0 }, { type: 'confirm' })
  expect(t.instruments).toEqual([{ id: s.hand[0].id, acquiredRound: 1 }])
  expect(t.phase).toBe('potionSelect')
  expect(t.hand).toHaveLength(3)
  expect(t.hand.every(c => c.kind === 'potion')).toBe(true)
})

it('select1 targeting replaces the target and enables confirm', () => {
  let s = createGame(DEFAULT_SETTINGS, sandbox({ forcedHand: [12] }))
  s = play(s, { type: 'selectCard', index: 0 })
  expect(needsTargets(s)).toBe('select1')
  expect(canConfirm(s)).toBe(false)
  s = play(s, { type: 'toggleTarget', tank: 0 }, { type: 'toggleTarget', tank: 1 })
  expect(s.targets).toEqual([1])
  expect(canConfirm(s)).toBe(true)
})

it('select1to2 toggles up to 2 targets and ignores empty tanks', () => {
  let s = createGame(DEFAULT_SETTINGS, sandbox({ forcedHand: [13] }))
  s = play(s, { type: 'selectCard', index: 0 }, { type: 'toggleTarget', tank: 0 }, { type: 'toggleTarget', tank: 1 }, { type: 'toggleTarget', tank: 4 })
  expect(s.targets).toEqual([0, 1])
  s = play(s, { type: 'toggleTarget', tank: 0 })
  expect(s.targets).toEqual([1])
})

it('switching cards clears targets', () => {
  let s = createGame(DEFAULT_SETTINGS, sandbox({ forcedHand: [12, 7] }))
  s = play(s, { type: 'selectCard', index: 0 }, { type: 'toggleTarget', tank: 0 }, { type: 'selectCard', index: 1 })
  expect(s.targets).toEqual([])
  expect(s.selected).toBe(1)
})

it('confirming a potion resolves it and advances the round', () => {
  let s = createGame(DEFAULT_SETTINGS, sandbox({ forcedHand: [12] }))
  s = play(s, { type: 'selectCard', index: 0 }, { type: 'toggleTarget', tank: 0 }, { type: 'confirm' })
  expect(s.tanks[0]!.activity).toBe(42)
  expect(s.round).toBe(2)
  expect(s.phase).toBe('potionSelect')
})

it('opening a box shows its cards; refresh rerolls the box contents', () => {
  let s = createGame(DEFAULT_SETTINGS, sandbox({ forcedHand: [33] }))
  s = play(s, { type: 'selectCard', index: 0 }, { type: 'confirm' })
  expect(s.openBox).toBe(33)
  expect(s.hand).toHaveLength(5)
  expect(s.hand.some(c => typeof potion(c.id).targeting === 'object')).toBe(false)
  s = play(s, { type: 'refresh' })
  expect(s.openBox).toBe(33)
  expect(s.hand).toHaveLength(5)
  expect(s.potionRefreshes).toBe(2)
  expect(s.round).toBe(1)
})

it('crossing both thresholds in one round queues two advanced picks', () => {
  let s = createGame(DEFAULT_SETTINGS, sandbox({ tanks: board(m('aemberon', 'boss', 300, 100)), forcedHand: [36] }))
  s = play(s, { type: 'selectCard', index: 0 }, { type: 'confirm' })
  expect(s.pendingPicks).toBe(2)
  expect(s.phase).toBe('instrumentSelect')
  expect(s.hand.every(c => c.kind === 'instrument' && c.id >= 9)).toBe(true)
  s = play(s, { type: 'selectCard', index: 0 }, { type: 'confirm' })
  expect(s.pendingPicks).toBe(1)
  expect(s.phase).toBe('instrumentSelect')
  s = play(s, { type: 'selectCard', index: 0 }, { type: 'confirm' })
  expect(s.instruments).toHaveLength(3)
  expect(s.phase).toBe('potionSelect')
  expect(s.round).toBe(2)
})

it('no pick is queued when 3 instruments are already equipped', () => {
  let s = createGame(DEFAULT_SETTINGS, sandbox({
    tanks: board(m('aemberon', 'boss', 300, 100)), forcedHand: [36],
    instruments: [{ id: 1, acquiredRound: 1 }, { id: 9, acquiredRound: 1 }, { id: 10, acquiredRound: 1 }],
  }))
  s = play(s, { type: 'selectCard', index: 0 }, { type: 'confirm' })
  expect(s.pendingPicks).toBe(0)
  expect(s.phase).toBe('potionSelect')
})

it('rounds 11–13 are played out one at a time with no potions', () => {
  let s = createGame(DEFAULT_SETTINGS, sandbox({ startRound: 11 }))
  expect(s.phase).toBe('roundEnd')
  expect(s.round).toBe(11)
  expect(s.hand).toEqual([])
  expect(canConfirm(s)).toBe(true)
  s = play(s, { type: 'confirm' })
  expect([s.phase, s.round]).toEqual(['roundEnd', 12])
  s = play(s, { type: 'confirm' })
  expect([s.phase, s.round]).toEqual(['roundEnd', 13])
  s = play(s, { type: 'confirm' })
  expect(s.phase).toBe('gameOver')
})

it('round 11 instruments resolve only when the round is ended', () => {
  const pests = board(m('pest', 'normal'), m('pest', 'normal'))
  let s = createGame(DEFAULT_SETTINGS, sandbox({ startRound: 11, tanks: pests }))
  const before = s.tanks.reduce((q, t) => q + (t?.quantity ?? 0), 0)
  expect(before).toBe(72)
  s = play(s, { type: 'confirm' })
  expect(s.tanks.reduce((q, t) => q + (t?.quantity ?? 0), 0)).toBe(72 + 32)
})

it('after round 10 the game moves to round 11 end-of-round step, then ends after 13', () => {
  let s = createGame(DEFAULT_SETTINGS, sandbox({ startRound: 10, forcedHand: [36] }))
  s = play(s, { type: 'selectCard', index: 0 }, { type: 'confirm' })
  expect([s.phase, s.round]).toEqual(['roundEnd', 11])
  expect(canRefresh(s)).toBe(false)
  s = play(s, { type: 'confirm' }, { type: 'confirm' }, { type: 'confirm' })
  expect(s.phase).toBe('gameOver')
  expect(ultimateActivity(s)).toBeGreaterThan(0)
})

it('dealt hands never repeat a potion; box deals never contain boxes', () => {
  for (let seed = 0; seed < 200; seed++) {
    const rng = createRng(seed)
    const hand = dealPotions(rng, 3, false)
    expect(new Set(hand.map(c => c.id)).size).toBe(3)
    const box = dealPotions(rng, 5, true)
    expect(new Set(box.map(c => c.id)).size).toBe(5)
    expect(box.some(c => typeof potion(c.id).targeting === 'object')).toBe(false)
  }
})

it('a double Confirm resolves the potion only once', () => {
  let s = createGame(DEFAULT_SETTINGS, sandbox({ forcedHand: [36] }))
  s = play(s, { type: 'selectCard', index: 0 }, { type: 'confirm' }, { type: 'confirm' })
  expect(s.round).toBe(2)
})

it('refresh with none left, or during game over, changes nothing', () => {
  const s = createGame({ potionRefreshes: 0, instrumentRefreshes: 0 }, sandbox())
  expect(dispatch(s, { type: 'refresh' }).state).toEqual(s)
  let over = createGame(DEFAULT_SETTINGS, sandbox({ startRound: 13 }))
  over = dispatch(over, { type: 'confirm' }).state
  expect(over.phase).toBe('gameOver')
  expect(dispatch(over, { type: 'refresh' }).state).toEqual(over)
})

it('dispatch never mutates its input', () => {
  const s = createGame(DEFAULT_SETTINGS, sandbox({ forcedHand: [36] }))
  const copy = structuredClone(s)
  play(s, { type: 'selectCard', index: 0 }, { type: 'confirm' })
  expect(s).toEqual(copy)
})

const deepFreeze = <T,>(o: T): T => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const v of Object.values(o)) deepFreeze(v)
  }
  return o
}

it('cloneState copies everything dispatch changes, and shares only what nothing changes', () => {
  const s = createGame(DEFAULT_SETTINGS, undefined, 7)
  const c = cloneState(s)
  expect(c).toEqual(s)
  for (const k of ['tanks', 'instruments', 'hand', 'targets', 'thresholds', 'log'] as const) expect(c[k]).not.toBe(s[k])
  s.tanks.forEach((t, i) => t && expect(c.tanks[i]).not.toBe(t))
  expect(c.settings).toBe(s.settings)
})

it('dispatch never changes the state it was given: a whole game on deep-frozen states', () => {
  let s = createGame(DEFAULT_SETTINGS, undefined, 11)
  for (let i = 0; i < 400 && s.phase !== 'gameOver'; i++) {
    deepFreeze(s)
    const a: Action = s.phase === 'roundEnd' ? { type: 'confirm' } : s.selected === null ? { type: 'selectCard', index: 0 } : needsTargets(s) && s.targets.length === 0 ? { type: 'toggleTarget', tank: s.tanks.findIndex(t => t) } : { type: 'confirm' }
    s = dispatch(s, a).state
  }
  expect(s.phase).toBe('gameOver')
})
