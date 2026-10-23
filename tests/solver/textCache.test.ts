import { cachedTextReader } from '@/solver/scan/textCache'
import type { Img } from '@/solver/scan/pixels'

const img = (w: number, h: number, f: (x: number, y: number) => number): Img => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set([f(x, y), f(x, y), f(x, y), 255], (y * w + x) * 4)
  return { width: w, height: h, data }
}
const title = (shift: number) => img(60, 12, (x, y) => ((x + shift) % 7 < 3 && y > 2 && y < 9 ? 230 : 20))

it('reads a title once, and answers the same picture again from memory', async () => {
  let reads = 0
  const read = cachedTextReader(async () => `name ${++reads}`)
  expect(await read(title(0))).toBe('name 1')
  // the same title in the next picture: a few grey levels of noise
  const again = title(0)
  for (let i = 0; i < again.data.length; i += 4) again.data[i] = again.data[i + 1] = again.data[i + 2] = again.data[i] + (i % 3)
  expect(await read(again)).toBe('name 1')
  expect(reads).toBe(1)
})

it('reads a different title, or one of another size, afresh', async () => {
  let reads = 0
  const read = cachedTextReader(async () => `name ${++reads}`)
  await read(title(0))
  expect(await read(title(3))).toBe('name 2')
  expect(await read(img(61, 12, () => 20))).toBe('name 3')
})

it('doesn’t remember a failed read', async () => {
  let n = 0
  const read = cachedTextReader(async () => {
    if (++n === 1) throw new Error('busy')
    return 'name'
  })
  await expect(read(title(0))).rejects.toThrow('busy')
  expect(await read(title(0))).toBe('name')
})
