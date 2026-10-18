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
