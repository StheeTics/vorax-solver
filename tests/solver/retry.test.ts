import { nextLook, RETRIES, unsureReading } from '@/solver/live/retry'
import type { Reading } from '@/solver/types'

const reading = (o: Partial<Reading> = {}): Reading => ({
  state: { tanks: [{ name: 'Sage', rarity: 'normal', activity: 36, quantity: 1 } as never, null, null, null, null, null], hand: ['A', 'B', 'C'], instruments: [], phase: 'potion' },
  fields: { 'tank0.activity': { sure: true }, 'tank0.quantity': { sure: true }, hand0: { sure: true }, hand1: { sure: true }, hand2: { sure: true } },
  problems: [],
  ...o,
})

it('a clean reading needs no other look', () => {
  expect(unsureReading(reading())).toBe(false)
})

it('another look when caught mid-animation, the board not found, or a tank or card not read for sure', () => {
  expect(unsureReading(reading({ problems: [{ kind: 'animating', field: 'hand1' } as never] }))).toBe(true)
  expect(unsureReading(reading({ problems: [{ kind: 'notFound' } as never] }))).toBe(true)
  expect(unsureReading(reading({ fields: { ...reading().fields, 'tank0.quantity': { sure: false } } }))).toBe(true)
  expect(unsureReading(reading({ fields: { ...reading().fields, hand2: { sure: false } } }))).toBe(true)
})

it('looks again after a board’s picture, up to six times, then stops', () => {
  let s = nextLook('board', true, 99)
  expect(s).toEqual({ looks: 1, again: true })
  for (let i = 2; i <= RETRIES; i++) {
    s = nextLook('manual', true, s.looks)
    expect(s).toEqual({ looks: i, again: true })
  }
  expect(nextLook('manual', true, s.looks)).toEqual({ looks: RETRIES, again: false })
  // a new board starts the count again
  expect(nextLook('screen', true, s.looks)).toEqual({ looks: 1, again: true })
})

it('stops as soon as a look reads cleanly; screenshots and capture mode aren’t retried', () => {
  expect(nextLook('manual', false, 2)).toEqual({ looks: 2, again: false })
  expect(nextLook(undefined, true, 0).again).toBe(false)
  expect(nextLook('tick', true, 0).again).toBe(false)
})

it('a protocol’s name not read for sure isn’t looked at again: it doesn’t change the advice', () => {
  const r = reading({ fields: { ...reading().fields, hand1: { sure: false } } })
  expect(unsureReading({ ...r, state: { ...r.state, phase: 'protocol' } })).toBe(false)
})
