// @vitest-environment node
import { lean, validate } from '../../worker/src/validate'

const names = { potions: ['Xeno-Hormone', 'Mutagenic Powder'], instruments: ['Hypertrophic Pituitary'], protocols: ['Trepanation'] }
const good = {
  uid: '0b6f1f4e-6a37-4c1e-9d0e-3f8a2b7c9d10', run: '5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', seq: 3, app: 'abc1234', source: 'live', trigger: 'board',
  round: 4, phase: 'potion', refreshes: 1, shelley: 6, corrected: ['hand0'],
  tanks: [{ archetype: 'pest', rarity: 'magic', activity: 5, quantity: 24 }, null, null, null, null, null],
  hand: ['Xeno-Hormone', 'Mutagenic Powder'], instruments: ['Hypertrophic Pituitary'],
}

it('keeps a well-formed snapshot field by field', () => {
  expect(validate(good, names)).toEqual(good)
})

it('keeps the fields the Solver wasn’t sure of; boards from before had none', () => {
  expect(validate({ ...good, unsure: ['tank0.activity', 'hand1', 'instrument3', 'phase'] }, names)).toEqual({ ...good, unsure: ['tank0.activity', 'hand1', 'instrument3', 'phase'] })
  expect(validate(good, names)).not.toHaveProperty('unsure')
  expect(validate({ ...good, unsure: ['<script>'] }, names)).toBeNull()
  expect(validate({ ...good, unsure: 'hand0' }, names)).toBeNull()
})

it('keeps a board flagged unreadable (a picture that wasn’t the game screen)', () => {
  expect(validate({ ...good, unreadable: true }, names)).toEqual({ ...good, unreadable: true })
  expect(validate({ ...good, unreadable: 'yes' }, names)).toEqual(good)
})

it('drops extra keys', () => {
  expect(validate({ ...good, ip: '1.2.3.4', name: 'me' }, names)).toEqual(good)
})

it.each([
  ['an unknown card', { hand: ['Not A Card'] }],
  ['an unknown instrument', { instruments: ['Nope'] }],
  ['more than 6 tanks', { tanks: [null, null, null, null, null, null, null] }],
  ['more than 5 cards', { hand: Array(6).fill('Xeno-Hormone') }],
  ['more than 3 instruments on offer', { phase: 'instrument', hand: Array(4).fill('Sinew Garrote') }],
  ['a round outside 1-13', { round: 14 }],
  ['a huge Activity', { tanks: [{ archetype: 'pest', rarity: 'magic', activity: 2_000_000, quantity: 1 }] }],
  ['a bad archetype', { tanks: [{ archetype: 'dragon', rarity: 'magic', activity: 5, quantity: 24 }] }],
  ['a bad uid', { uid: 'x' }],
  ['a bad phase', { phase: 'shop' }],
])('rejects %s', (_, patch) => {
  expect(validate({ ...good, ...patch }, names)).toBeNull()
})

it('protocol picks are checked against protocol names', () => {
  expect(validate({ ...good, phase: 'protocol', hand: ['Trepanation'] }, names)).not.toBeNull()
  expect(validate({ ...good, phase: 'protocol', hand: ['Xeno-Hormone'] }, names)).toBeNull()
})

it('a Potion Kit’s five-card hand is kept, with its cards corrected by place', () => {
  const five = ['Xeno-Hormone', 'Mutagenic Powder', 'Xeno-Hormone', 'Mutagenic Powder', 'Xeno-Hormone']
  expect(validate({ ...good, hand: five, corrected: ['hand4'] }, names)).toMatchObject({ hand: five, corrected: ['hand4'] })
})

it('keeps the advice shown with a board, and drops a malformed one without losing the board', () => {
  const advice = { move: 'Play Xeno-Hormone (card 1) → tank 2', activity: 812000, reached: 0.4 }
  expect(validate({ ...good, advice }, names)).toEqual({ ...good, advice })
  expect(validate({ ...good, advice: { move: 'x'.repeat(500), activity: -3 } }, names)).toEqual(good)
})

describe('the debug part: kept field by field, dropped whole (board kept) when anything in it is off', () => {
  const debug = {
    frame: [1920, 1200], dpr: 1.25, hdr: true, browser: 'Electron 33', ms: 412, off: 0.31, corrected: true,
    tanks: [{ rgb: [200, 210, 230], total: '120', aq: '5x24361' }, null, null, null, null, null],
    scores: { 'tank0.activity': [0.61, 0.58] },
    window: { outer: [1936, 1239], client: [1920, 1200], scale: 1.25 },
  }
  it('keeps a well-formed one', () => {
    expect(validate({ ...good, debug }, names)).toEqual({ ...good, debug })
  })
  it('without the optional parts', () => {
    const plain: Record<string, unknown> = { ...debug }
    delete plain.window
    delete plain.ms
    expect(validate({ ...good, debug: plain }, names)).toEqual({ ...good, debug: plain })
  })
  it('rebuilt from the keys it knows, like the board: anything else is left behind', () => {
    const sent = { ...debug, window: { ...debug.window, title: 'Torchlight' }, ip: '1.2.3.4' }
    expect(validate({ ...good, debug: sent }, names)).toEqual({ ...good, debug })
  })
  it('a broken read’s values are trimmed, not a reason to drop it: those are the boards it’s for', () => {
    const broken = { ...debug, tanks: [{ rgb: [1, 2, 3], total: '1'.repeat(30), aq: '12x'.repeat(10) }], scores: { 'tank0.activity': [1.0000004, -1.2] } }
    expect(validate({ ...good, debug: broken }, names)!.debug).toMatchObject({ tanks: [{ total: '1'.repeat(16), aq: '12x'.repeat(10).slice(0, 16) }], scores: { 'tank0.activity': [1, -1] } })
  })
  it.each([
    ['a browser that isn’t a short name', { browser: '<img src=x>' }],
    ['a line read with letters in it', { tanks: [{ rgb: [1, 2, 3], total: 'abc', aq: '' }] }],
    ['a colour out of range', { tanks: [{ rgb: [1, 2, 300], total: '', aq: '' }] }],
    ['a huge frame', { frame: [100000, 10] }],
    ['a score for a field that doesn’t exist', { scores: { 'password': [0.5, 0.4] } }],
    ['too many tanks', { tanks: Array(7).fill(null) }],
  ])('drops it with %s', (_, change) => {
    expect(validate({ ...good, debug: { ...debug, ...change } }, names)).toEqual(good)
  })
})

describe('how a live board’s read went (its timings), shared to make reading faster', () => {
  const debug = { frame: [1920, 1080], dpr: 1, hdr: false, browser: 'Electron 44', off: 0.05, corrected: false, tanks: [], scores: {} }
  const timing = { why: 'dealt', lag: 40, log: 180, screen: 35, early: true, pixels: 120, names: 210, steps: [1, 1, 2] }
  it('keeps well-formed timings', () => {
    expect(validate({ ...good, debug: { ...debug, timing } }, names)!.debug).toEqual({ ...debug, timing })
  })
  it('keeps the parts there are (older Solvers send fewer)', () => {
    expect(validate({ ...good, debug: { ...debug, timing: { pixels: 90, names: 300 } } }, names)!.debug).toEqual({ ...debug, timing: { pixels: 90, names: 300 } })
  })
  it.each([
    ['an unknown reason', { why: '<b>' }],
    ['a negative time', { log: -5 }],
    ['an endless time', { screen: 9e9 }],
    ['a step that doesn’t exist', { steps: [1, 7] }],
    ['too many steps', { steps: [1, 1, 1, 1, 1, 1] }],
    ['a reason that isn’t a word', { early: 'yes' }],
  ])('drops the timings alone with %s, keeping the rest', (_, change) => {
    expect(validate({ ...good, debug: { ...debug, timing: { ...timing, ...change } } }, names)!.debug).toEqual(debug)
  })
  it('keeps how long the advice took, and drops only that when it’s off', () => {
    const advice = { move: 'Refresh', activity: null, reached: null }
    expect(validate({ ...good, advice: { ...advice, ms: 640 } }, names)!.advice).toEqual({ ...advice, ms: 640 })
    expect(validate({ ...good, advice: { ...advice, ms: -1 } }, names)!.advice).toEqual(advice)
  })
})

it('keeps the random install number players are counted by; a malformed one is dropped, the board kept', () => {
  const install = '7d444840-9dc0-41d2-8f2b-0e7c1b8f3a11'
  expect(validate({ ...good, install }, names)).toEqual({ ...good, install })
  expect(validate({ ...good, install: 'me@example.com' }, names)).toEqual(good)
})

describe('what’s stored of a board (lean): no cards or tanks', () => {
  it('its total in place of its tanks, and how many instruments in place of their names', () => {
    const b = lean(validate({ ...good, debug: undefined }, names)!)
    expect(b).toEqual({ ...good, tanks: undefined, hand: undefined, instruments: undefined, score: 120, picks: 1 })
    expect(Object.keys(b)).not.toContain('tanks')
  })
  it('a final score only on the round-13 board', () => {
    expect(validate({ ...good, final: 5 }, names)).not.toHaveProperty('final')
    const last = { ...good, round: 13, phase: 'protocol', hand: ['Trepanation'] }
    expect(validate({ ...last, final: 999 }, names)).toMatchObject({ final: 999 })
    expect(validate({ ...last, final: -1 }, names)).not.toHaveProperty('final')
    expect(lean(validate({ ...last, final: 999 }, names)!).final).toBe(999)
    expect(lean(validate(last, names)!).final).toBe(120)
  })
  it('the advice’s predicted end without its move', () => {
    const advice = { move: 'Play Xeno-Hormone (card 1) → tank 2', activity: 812000, reached: 0.4, ms: 30 }
    expect(lean(validate({ ...good, advice }, names)!).advice).toEqual({ activity: 812000, reached: 0.4, ms: 30 })
  })
})
