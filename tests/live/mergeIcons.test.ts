// @vitest-environment node
import { acceptIcons, type TaughtIcon } from '../../scripts/live/mergeIcons'

const unit = (v: number[]) => { const n = Math.hypot(...v); return v.map(x => x / n) }
// three orthogonal-ish patterns standing in for three icons
const A = unit([1, 0.1, 0, 0, 0.05])
const A2 = unit([1, 0.15, 0.02, 0, 0])
const B = unit([0, 1, 0.1, 0, 0])
const C = unit([0, 0, 0, 1, 0.1])
const taught = (name: string, pattern: number[], uid = Math.random().toString()): TaughtIcon => ({ uid, name, pattern })

describe('which icons players taught go into the reader for everyone', () => {
  it('two answers that agree on an instrument the reader has no icon for', () => {
    expect(acceptIcons([taught('Nettle Toggle', A), taught('Nettle Toggle', A2)], {})).toEqual({ 'Nettle Toggle': [A, A2] })
  })
  it('a single answer that matches the icon the reader already has (more variety)', () => {
    expect(acceptIcons([taught('Nettle Toggle', A2)], { 'Nettle Toggle': [A] })).toEqual({ 'Nettle Toggle': [A2] })
  })
  it('one answer, for an instrument the reader has no icon for (a wrong one rarely matches a new picture, so the player is just asked again)', () => {
    expect(acceptIcons([taught('Nettle Toggle', A)], {})).toEqual({ 'Nettle Toggle': [A] })
  })
  it('not an answer for an instrument the reader knows when it doesn’t match that instrument’s icon: one wrong click mustn’t teach everyone', () => {
    expect(acceptIcons([taught('Nettle Toggle', C)], { 'Nettle Toggle': [A] })).toEqual({})
  })
  it('not an icon that looks more like another instrument the reader knows', () => {
    expect(acceptIcons([taught('Nettle Toggle', B), taught('Nettle Toggle', B)], { 'Sinew Garrote': [B] })).toEqual({})
  })
  it('never for the empty slot or the starting item', () => {
    expect(acceptIcons([taught('none', A), taught('none', A2), taught('(starting item)', A), taught('(starting item)', A2)], {})).toEqual({})
  })
  it('the same answer sent twice counts once', () => {
    expect(acceptIcons([taught('Nettle Toggle', A, 'u1'), taught('Nettle Toggle', A, 'u1')], {})).toEqual({ 'Nettle Toggle': [A] })
  })
})
