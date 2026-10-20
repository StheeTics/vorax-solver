// @vitest-environment node
import { acceptIcons, type TaughtIcon } from '../../scripts/live/mergeIcons'
import { readFileSync } from 'node:fs'
import { unpack, type PackedScanData } from '../../src/solver/scan/data'

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
  it('not one answer alone, for an instrument the reader has no icon for: a wrong one became the only picture the reader had (Chrysalis Specimen, 2026-10-19), and the advice followed it', () => {
    expect(acceptIcons([taught('Nettle Toggle', A)], {})).toEqual({})
  })
  it('not answers that disagree with each other, for one it has no icon for: only those two or more agree on', () => {
    expect(acceptIcons([taught('Nettle Toggle', A), taught('Nettle Toggle', C)], {})).toEqual({})
    expect(acceptIcons([taught('Nettle Toggle', A), taught('Nettle Toggle', C), taught('Nettle Toggle', A2)], {})).toEqual({ 'Nettle Toggle': [A, A2] })
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
  it('the same answer sent twice counts once: it can’t agree with itself', () => {
    expect(acceptIcons([taught('Nettle Toggle', A, 'u1'), taught('Nettle Toggle', A, 'u1')], {})).toEqual({})
  })
})

describe('real panel icons, cropped a few pixels apart', () => {
  // a built-in icon, and the same one moved 5 pixels right (players' named Chrysalis Specimens sat that far apart)
  const icons = unpack(JSON.parse(readFileSync('src/solver/scan/data.json', 'utf8')) as PackedScanData).instrumentIcons
  // Canine Teeth File: no other instrument's picture comes close (0.59), so only the lining up is tested
  const nail = icons['Canine Teeth File'][0]
  const move = (p: number[], dx: number) => {
    const bg = Math.min(...p)
    const q = p.map((_, i) => ((i % 24) - dx >= 0 && (i % 24) - dx < 24 ? p[i - dx] : bg))
    const m = q.reduce((s, v) => s + v, 0) / q.length, c = q.map(v => v - m), n = Math.hypot(...c)
    return c.map(v => v / n)
  }
  const others = Object.fromEntries(Object.entries(icons).filter(([n]) => n !== 'Canine Teeth File'))
  it('two answers of the same icon agree even when one was cropped 5 pixels off', () => {
    expect(acceptIcons([taught('Canine Teeth File', nail), taught('Canine Teeth File', move(nail, 5))], others)['Canine Teeth File']).toHaveLength(2)
  })
  it('an answer the owner confirmed counts alone (one picture of an instrument the reader has none of)', () => {
    const t = taught('Canine Teeth File', move(nail, 3), 'confirmed-uid')
    expect(acceptIcons([t], others)).toEqual({})
    expect(acceptIcons([t], others, new Set(['confirmed-uid']))['Canine Teeth File']).toHaveLength(1)
  })
})
