import data from '@/solver/scan/data.json'
import { names } from '@/strategy/advisor'
import { unpack, type PackedScanData } from '@/solver/scan/data'

const d = unpack(data as unknown as PackedScanData)

it('has every digit and the x for tank labels, as 192-long glyph vectors', () => {
  expect(Object.keys(d.digits.label).sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'x'])
  for (const vs of Object.values(d.digits.label)) for (const v of vs) expect(v).toHaveLength(192)
})

it('knows the name colour of the rarities seen so far', () => {
  for (const r of ['normal', 'magic', 'rare'] as const) expect(d.rarityRgb[r].length).toBeGreaterThan(0)
})

it('every potion and instrument card it knows is one the advisor knows', () => {
  const n = names()
  for (const key of Object.keys(d.cards)) {
    const [phase, name] = key.split(/:(.*)/)
    if (phase === 'potion') expect(n.potions).toContain(name)
    if (phase === 'instrument') expect(n.instruments).toContain(name)
  }
  for (const name of Object.keys(d.instrumentIcons)) if (name !== 'none') expect(n.instruments).toContain(name)
})

it('knows the three header shapes', () => {
  expect(Object.keys(d.headers).sort()).toEqual(['instrument', 'potion', 'protocol'])
})

describe('packed text shapes', () => {
  it('come back within half a step (0.001) of what was packed', async () => {
    const { packTexts, unpackTexts } = await import('@/solver/scan/data')
    const texts = { 'potion:Slough Solution': [[0.131, -0.131, 0.0, 0.017, -0.003]] }
    const back = unpackTexts(packTexts(texts))
    back['potion:Slough Solution'][0].forEach((v, i) => expect(Math.abs(v - texts['potion:Slough Solution'][0][i])).toBeLessThanOrEqual(0.001 + 1e-9))
  })
  it('are stored as text in the data file, a few times smaller', () => {
    const raw = data as unknown as { texts: Record<string, unknown[]> }
    for (const vs of Object.values(raw.texts)) for (const v of vs) expect(typeof v).toBe('string')
  })
})
