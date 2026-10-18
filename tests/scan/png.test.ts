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
