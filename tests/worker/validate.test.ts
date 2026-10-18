// @vitest-environment node
import { validate } from '../../worker/src/validate'

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
