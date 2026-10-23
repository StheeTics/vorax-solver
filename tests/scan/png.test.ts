import { decodePng, encodePng } from '../../scripts/scan/png'

it('encodes and decodes an RGBA image unchanged', () => {
  const w = 7, h = 5
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < data.length; i++) data[i] = (i * 37) % 256
  const back = decodePng(encodePng({ width: w, height: h, data }))
  expect([back.width, back.height]).toEqual([w, h])
  expect(Array.from(back.data)).toEqual(Array.from(data))
})

it('rejects something that is not a PNG', () => {
  expect(() => decodePng(Buffer.from('nope'))).toThrow(/PNG/)
})

it('rows are written with the Up filter, so flat areas compress', () => {
  const w = 64, h = 64
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set([x * 4, 100, 50, 255], (y * w + x) * 4)
  const png = encodePng({ width: w, height: h, data })
  expect(Array.from(decodePng(png).data)).toEqual(Array.from(data))
  expect(png.length).toBeLessThan(400)
})

it('decodes a JPEG too (screenshots sent as training data), to RGBA of its size', async () => {
  const { default: jpeg } = await import('jpeg-js')
  const data = Buffer.alloc(16 * 8 * 4)
  for (let i = 0; i < data.length; i += 4) [data[i], data[i + 1], data[i + 2], data[i + 3]] = [200, 40, 40, 255]
  const img = decodePng(Buffer.from(jpeg.encode({ data, width: 16, height: 8 }, 90).data))
  expect([img.width, img.height, img.data.length]).toEqual([16, 8, 16 * 8 * 4])
  // lossy, but close: a flat red stays red
  expect(Math.abs(img.data[0] - 200)).toBeLessThan(8)
  expect(Math.abs(img.data[1] - 40)).toBeLessThan(8)
})
