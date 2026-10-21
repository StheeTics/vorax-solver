import { board, ctx, m, rollFor } from '../helpers'
import { MAX_CHAIN_DEPTH } from '@/engine/context'
import { stubRng } from '@/engine/rng'
import type { InstrumentDef } from '@/data/defs'

const full = () => board(...Array.from({ length: 6 }, () => m('pest', 'normal')))

describe('add', () => {
  it('fills the leftmost empty tank', () => {
    const { c } = ctx(board(m('pest', 'normal')))
    expect(c.add('agito', 'magic')).toBe(1)
    expect(c.tanks[1]).toEqual(m('agito', 'magic'))
  })
  it('returns -1 and emits addOverflow when full', () => {
    const { c, events } = ctx(full())
    expect(c.add('pest', 'normal')).toBe(-1)
    expect(events.map(e => e.type)).toEqual(['addOverflow'])
  })
})

it('mutate random rarity rerolls by weight and keeps stats', () => {
  const { c, events } = ctx(board(m('pest', 'normal', 7, 9)), { rng: stubRng([rollFor('magic')]) })
  c.mutate(0, 'aemberon', 'random')
  expect(c.tanks[0]).toEqual({ archetype: 'aemberon', rarity: 'magic', activity: 7, quantity: 9 })
  expect(events).toHaveLength(1)
  expect(events[0].type).toBe('mutate')
})

it('awaken boss → boss gives nothing', () => {
  const { c } = ctx(board(m('aemberon', 'boss')))
  c.awaken(0)
  expect(c.tanks[0]).toMatchObject({ rarity: 'boss', activity: 300 })
})

it('fuse removes sources, places result leftmost, emits remove,remove,add,fuse', () => {
  const { c, events } = ctx(board(null, m('agito', 'magic'), m('boneSentry', 'rare')))
  expect(c.fuse([1, 2], 'pest', 'rare')).toBe(0)
  expect(c.tanks[0]).toEqual({ archetype: 'pest', rarity: 'rare', activity: 20, quantity: 36 })
  expect(c.tanks[1]).toBeNull()
  expect(c.tanks[2]).toBeNull()
  expect(events.map(e => e.type)).toEqual(['remove', 'remove', 'add', 'fuse'])
})

it('devour adds prey stats and removes prey', () => {
  const { c } = ctx(board(m('pest', 'normal', 10, 10), m('pest', 'normal', 5, 5)))
  c.devour(0, 1)
  expect(c.tanks[0]).toMatchObject({ activity: 15, quantity: 15 })
  expect(c.tanks[1]).toBeNull()
})

it('highest/lowest break ties to the leftmost; neighbor skips empties', () => {
  const { c } = ctx(board(null, m('pest', 'normal'), m('agito', 'normal'), null, m('pest', 'rare')))
  expect(c.highest()).toBe(4)
  expect(c.lowest()).toBe(1)
  expect(c.neighbor(2, 1)).toBe(4)
  expect(c.neighbor(1, -1)).toBe(-1)
})

describe('event bus', () => {
  it('fires reactive instruments immediately in id order', () => {
    const order: string[] = []
    const defs: Record<number, InstrumentDef> = {
      3: { id: 3, name: 'three', pool: 'basic', timing: { kind: 'reactive', on: ['add'] }, text: '', onEvent: () => { order.push('three') } },
      2: { id: 2, name: 'two', pool: 'basic', timing: { kind: 'reactive', on: ['add'] }, text: '', onEvent: () => { order.push('two') } },
    }
    const { c } = ctx(board(), { registry: id => defs[id], instruments: [{ id: 3, acquiredRound: 1 }, { id: 2, acquiredRound: 1 }] })
    c.add('pest', 'normal')
    order.push('returned')
    expect(order).toEqual(['two', 'three', 'returned'])
  })

  it('caps chains at MAX_CHAIN_DEPTH and logs one cutoff', () => {
    const loop: InstrumentDef = {
      id: 1, name: 'loop', pool: 'basic', timing: { kind: 'reactive', on: ['add'] }, text: '',
      onEvent: (c, e) => { if (e.type === 'add') { c.remove(e.tank); c.add('pest', 'normal') } },
    }
    const { c, log, events } = ctx(board(), { registry: id => (id === 1 ? loop : undefined), instruments: [{ id: 1, acquiredRound: 1 }] })
    c.add('pest', 'normal')
    expect(log.filter(l => l.kind === 'cutoff')).toHaveLength(1)
    expect(events.filter(e => e.type === 'add').length).toBeLessThanOrEqual(2 * (MAX_CHAIN_DEPTH + 1))
  })
})
