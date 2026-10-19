import { rarityOf } from '@/solver/scan/tanks'

it.each([
  [[144, 172, 190], 'magic'],
  [[118, 140, 156], 'magic'],
  [[126, 115, 115], 'normal'],
  [[169, 167, 166], 'normal'],
  [[139, 115, 117], 'normal'],
  [[205, 164, 102], 'rare'],
  [[183, 68, 68], 'boss'],
] as const)('a name coloured %j is %s', (rgb, want) => {
  const r = rarityOf(rgb as unknown as [number, number, number])
  expect(r.rarity).toBe(want)
  expect(r.sure).toBe(true)
})

it('a washed-out blue between normal and magic is unsure', () => {
  expect(rarityOf([130, 136, 140]).sure).toBe(false)
})

import { stats } from '@/solver/scan/tanks'

it('reads Activity x Quantity and checks it against the total', () => {
  expect(stats('3360', '112x30')).toEqual({ activity: 112, quantity: 30, fits: true })
  expect(stats('3361', '112x30').fits).toBe(false)
})

it('a misread with no x or a runaway number stays within the game and is unsure', () => {
  const run = stats('794477777777777777777777777777777', '794477777777777777777777777777777x1')
  expect(run.activity).toBeLessThanOrEqual(1_000_000)
  expect(run.fits).toBe(false)
  const noX = stats('120', '524')
  expect(noX).toEqual({ activity: 1, quantity: 1, fits: false })
})

import { archetypeOf } from '@/solver/scan/tanks'

const icon = (colour: [number, number, number], n: number) => {
  // a 10x10 box of red glass with n pixels of the icon's colour
  const data = new Uint8ClampedArray(400)
  for (let i = 0; i < 100; i++) data.set([...(i < n ? colour : [200, 40, 40]), 255] as number[], i * 4)
  return { width: 10, height: 10, data }
}
const box = { x: 0, y: 0, w: 10, h: 10 }

it.each([
  [[230, 190, 40], 'boneSentry'],
  [[150, 70, 220], 'pest'],
  [[120, 150, 175], 'aemberon'],
] as const)('an icon coloured %j on red glass is %s', (c, want) => {
  expect(archetypeOf(icon(c as unknown as [number, number, number], 8), box).archetype).toBe(want)
})

it('only red is the Agito sun', () => {
  expect(archetypeOf(icon([200, 40, 40], 0), box)).toEqual({ archetype: 'agito', sure: true })
})

import { reconcile } from '@/solver/scan/tanks'

// each glyph's best few characters, best first
const alts = (s: string[][]) => s

describe('digits that don’t fit the total are corrected from it', () => {
  it('finds the Activity x Quantity whose product is the total, trying each glyph’s next-best characters', () => {
    // "463 x 167" read as "863x167": the 4 touches the heart and looked like an 8
    const total = alts([['7'], ['7'], ['3'], ['2'], ['1']])
    const aq = alts([['8', '4', '6'], ['6', '3'], ['3', '8'], ['x'], ['1'], ['6'], ['7']])
    expect(reconcile(total, aq)).toEqual({ total: '77321', aq: '463x167' })
  })
  it('works the other way: when the total is the one misread', () => {
    // "77321" read as "71321"
    const total = alts([['7'], ['1', '7'], ['3'], ['2'], ['1']])
    const aq = alts([['4'], ['6'], ['3'], ['x'], ['1'], ['6'], ['7']])
    expect(reconcile(total, aq)).toEqual({ total: '77321', aq: '463x167' })
  })
  it('keeps what was read when it already fits', () => {
    expect(reconcile(alts([['3'], ['6']]), alts([['1'], ['x'], ['3', '8'], ['6']]))).toEqual({ total: '36', aq: '1x36' })
  })
  it('when a digit isn’t among its candidates, divides the total by the other number, if that changes only that digit', () => {
    // "143 x 36" read as "343x36", and 1 isn't among the first digit's candidates; 5148 / 36 = 143
    const total = alts([['5'], ['1'], ['4'], ['8']])
    const aq = alts([['3', '2', '0'], ['4'], ['3'], ['x'], ['3'], ['6']])
    expect(reconcile(total, aq)).toEqual({ total: '5148', aq: '143x36' })
  })
  it('doesn’t divide its way to a number that differs in more than one digit', () => {
    // 5148 / 36 = 143, but "943" read as "333" would need two digits changed
    expect(reconcile(alts([['5'], ['1'], ['4'], ['8']]), alts([['3'], ['3'], ['3'], ['x'], ['3'], ['6']]))).toBeNull()
  })
  it('drops a stray glyph at either end of a line (a sliver of the heart) when the rest fits', () => {
    // "416 x 270" read as "416x2701" on a frame captured through HDR
    expect(reconcile(alts([['1'], ['1'], ['2'], ['3'], ['2'], ['0']]), alts([['4'], ['1'], ['6'], ['x'], ['2'], ['7'], ['0'], ['1']]))).toEqual({ total: '112320', aq: '416x270' })
    expect(reconcile(alts([['1'], ['1'], ['2'], ['3'], ['2'], ['0']]), alts([['1'], ['4'], ['1'], ['6'], ['x'], ['2'], ['7'], ['0']]))).toEqual({ total: '112320', aq: '416x270' })
    // "112320" read as "1123201"
    expect(reconcile(alts([['1'], ['1'], ['2'], ['3'], ['2'], ['0'], ['1']]), alts([['4'], ['1'], ['6'], ['x'], ['2'], ['7'], ['0']]))).toEqual({ total: '112320', aq: '416x270' })
  })
  it('gives up when nothing fits, or when two readings fit equally well', () => {
    expect(reconcile(alts([['9'], ['9']]), alts([['2'], ['x'], ['3']]))).toBeNull()
    // 3x4 and 2x6 both make 12, each using one second choice
    expect(reconcile(alts([['1'], ['2']]), alts([['3', '2'], ['x'], ['6', '4']]))).toBeNull()
  })
})
