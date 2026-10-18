// @vitest-environment node
// The text reader (Tesseract) runs in Node here, as the scripts use it.
import { existsSync, readFileSync } from 'node:fs'
import { decodePng } from '../../scripts/scan/png'
import { nodeTextReader } from '../../scripts/scan/ocr'
import { scan } from '@/solver/scan/scan'
import { readTitles } from '@/solver/scan/titles'
import { readSlots } from '@/solver/scan/cards'
import { layout } from '@/solver/scan/layout'
import raw from '@/solver/scan/data.json'
import { unpack, type PackedScanData } from '@/solver/scan/data'

const data = unpack(raw as unknown as PackedScanData)

const local = existsSync('training/g2-ticks/076-tick.png')

describe.skipIf(!local)('cards read by their printed names', () => {
  const cards = JSON.parse(readFileSync('scripts/scan/cards.json', 'utf8')) as Record<string, { phase: string; hand: string[] }>
  let ocr: Awaited<ReturnType<typeof nodeTextReader>>
  beforeAll(async () => {
    ocr = await nodeTextReader(1)
  }, 60_000)
  afterAll(() => ocr.stop())

  // as the site reads them: names first, pictures only where a name can't be read
  const site = async (f: string) => {
    const img = decodePng(readFileSync(`training/${f}`))
    return readTitles(img, scan(img, data, {}, { pictures: false }), ocr.readText, async (phase, size, slots) => {
      const { fields, problems, ranks } = readSlots(img, layout(img), size, phase, slots, data)
      return Object.fromEntries(slots.map(j => [j, { ranks: ranks[j], field: fields[`hand${j}`], unknown: problems.some(p => p.kind === 'unknownArt' && p.field === `hand${j}`) }]))
    })
  }
  for (const f of ['g2-ticks/018-tick.png', 'g2-ticks/037-tick.png', 'g2-ticks/059-tick.png']) {
    it(`reads a hand with a card raised by the mouse (${f})`, async () => {
      expect((await site(f)).state.hand).toEqual(cards[f].hand)
    }, 60_000)
  }
  for (const f of ['g2-ticks/076-tick.png', 'g2-ticks/093-tick.png']) {
    it(`a raised card over the header: the names show it's the potion pick (${f})`, async () => {
      const img = decodePng(readFileSync(`training/${f}`))
      const r = await readTitles(img, scan(img, data, {}, { pictures: false }), ocr.readText)
      expect([r.state.phase, r.state.hand]).toEqual([cards[f].phase, cards[f].hand])
    }, 60_000)
  }
  it('names Rousing Salts from its printed title', async () => {
    const img = decodePng(readFileSync('training/g3-ticks/085-tick.png'))
    const r = await readTitles(img, scan(img, data, {}, { pictures: false }), ocr.readText)
    expect(r.state.hand).toEqual(cards['g3-ticks/085-tick.png'].hand)
  }, 60_000)
})
