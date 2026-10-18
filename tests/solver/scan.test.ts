import { existsSync, readFileSync } from 'node:fs'
import { decodePng } from '../../scripts/scan/png'
import { scan } from '@/solver/scan/scan'
import raw from '@/solver/scan/data.json'
import { unpack, type PackedScanData } from '@/solver/scan/data'

const data = unpack(raw as unknown as PackedScanData)
import type { Label } from '../../scripts/scan/buildData'

const truth = JSON.parse(readFileSync('scripts/scan/truth.json', 'utf8')) as Record<string, Label>
const local = existsSync('training/003-board.png')

describe.skipIf(!local)('reading the labelled live frames (training/)', () => {
  for (const [file, label] of Object.entries(truth)) {
    if (!label.state) continue
    it(`reads ${file}`, () => {
      const r = scan(decodePng(readFileSync(`training/${file}`)), data)
      expect(r.problems).toEqual([])
      expect(r.state).toEqual(label.state)
      expect(Object.entries(r.fields).filter(([, f]) => !f.sure).map(([k]) => k)).toEqual([])
    })
  }
})

it('a black frame is not the Surgical Preparation screen', () => {
  const img = { width: 1280, height: 720, data: new Uint8ClampedArray(1280 * 720 * 4).fill(0) }
  const r = scan(img, data)
  expect(r.problems).toEqual([{ kind: 'notFound' }])
})

describe('committed fixtures (masked live frames)', () => {
  const read = (f: string) => scan(decodePng(readFileSync(`tests/fixtures/frames/${f}`)), data)

  it('reads a potion round exactly', () => {
    const r = read('board-012.png')
    expect(r.problems).toEqual([])
    expect(r.state).toEqual(truth['012-board.png'].state)
  })

  it('reads a Surgical Protocol round', () => {
    const r = read('protocol-018.png')
    expect(r.state.phase).toBe('protocol')
    expect(r.state.hand).toEqual(truth['018-board.png'].state!.hand)
    expect(r.state.round).toBe(11)
  })

  it('flags a card it cannot recognise', () => {
    const r = read('unknown-card.png')
    expect(r.problems).toEqual([expect.objectContaining({ kind: 'unknownArt', field: 'hand1' })])
    expect(r.fields.hand1.sure).toBe(false)
  })
})


describe.skipIf(!local)('cards named in the browser', () => {
  it('only help read the hand, never the equipped-instrument icons', async () => {
    const { layout } = await import('@/solver/scan/layout')
    const { artFeature } = await import('@/solver/scan/pixels')
    const img = decodePng(readFileSync('training/012-board.png'))
    // the worst case: a name stored by "What is this?" whose picture happens to match a panel icon exactly
    const named = { 'instrument:Hyperplastic Frontal Lobe': [artFeature(img, layout(img).instrumentIcon[0])] }
    const r = scan(img, data, named)
    expect(r.state.instruments).toEqual(truth['012-board.png'].state!.instruments)
  })
})

describe.skipIf(!local)('the potion-activation animation', () => {
  it('is recognised (one card left on the floor) and not read as a hand', () => {
    for (const f of ['g2-ticks/042-tick.png', 'g3-ticks/015-tick.png', 'g3-ticks/077-tick.png']) {
      const r = scan(decodePng(readFileSync(`training/${f}`)), data)
      expect(r.problems).toEqual([{ kind: 'animating' }])
    }
  })
  it('a normal hand is not mistaken for it', () => {
    const r = scan(decodePng(readFileSync('training/g3-ticks/085-tick.png')), data)
    expect(r.problems.some(p => p.kind === 'animating')).toBe(false)
  })
})

describe.skipIf(!local)('the size of the hand', () => {
  it('is five when cards sit at the far ends of the fan (a Potion Kit)', async () => {
    const { layout } = await import('@/solver/scan/layout')
    const { fanSize } = await import('@/solver/scan/cards')
    for (const f of ['g3-026-board.png', 'g3-ticks/030-tick.png']) {
      const img = decodePng(readFileSync(`training/${f}`))
      expect(fanSize(img, layout(img))).toBe(5)
    }
    for (const f of ['g3-042-board.png', 'g4-053-board.png', 'g3-ticks/088-tick.png']) {
      const img = decodePng(readFileSync(`training/${f}`))
      expect(fanSize(img, layout(img))).toBe(3)
    }
  })
})

describe.skipIf(!local)('a card raised by the mouse', () => {
  it('fits its references about 35 px higher than a resting card does', async () => {
    const { layout } = await import('@/solver/scan/layout')
    const { fitOffset } = await import('@/solver/scan/cards')
    const img = decodePng(readFileSync('training/g2-ticks/059-tick.png'))
    const l = layout(img)
    expect(fitOffset(img, l.cards[2], l.k, 'potion:Xenopurge Powder', data)!.at[1]).toBeLessThanOrEqual(-27)
    expect(fitOffset(img, l.cards[0], l.k, 'potion:Pure Leech Solution', data)!.at[1]).toBe(0)
  })
})

describe.skipIf(!local)('a 1440p frame shrunk to 1080p', () => {
  it('still finds every filled tank', async () => {
    const { resize } = await import('@/solver/scan/pixels')
    for (const f of ['006-board.png', '012-board.png', '016-board.png']) {
      const big = decodePng(readFileSync(`training/${f}`))
      const r = scan(resize(big, Math.round(big.width * 0.75), Math.round(big.height * 0.75)), data)
      expect(r.state.tanks.map(t => !!t)).toEqual(truth[f].state!.tanks.map(t => !!t))
    }
  })
  it('reads the refresh count beside Shelley’s portrait', async () => {
    const { resize } = await import('@/solver/scan/pixels')
    for (const f of ['007-board.png', '008-board.png', 'g3-037-board.png']) {
      const big = decodePng(readFileSync(`training/${f}`))
      const r = scan(resize(big, Math.round(big.width * 0.75), Math.round(big.height * 0.75)), data)
      const want = truth[f].state!
      expect(want.phase === 'potion' ? r.state.potionRefreshes : r.state.instrumentRefreshes).toBe(want.phase === 'potion' ? want.potionRefreshes : want.instrumentRefreshes)
    }
  })
})

describe.skipIf(!existsSync('training/g5-011-board.png'))('a panel icon named in the browser', () => {
  it('is recognised on the next boards', async () => {
    const { layout } = await import('@/solver/scan/layout')
    const { iconPattern, readInstruments } = await import('@/solver/scan/instruments')
    const learnedFrom = decodePng(readFileSync('training/g5-011-board.png'))
    const learned = { 'icon:Egg-Burdened Butterfly': [iconPattern(learnedFrom, layout(learnedFrom).instrumentIcon[0])] }
    const later = decodePng(readFileSync('training/g5-018-board.png'))
    // as before the built-in data had this icon
    const icons = { ...data.instrumentIcons }
    delete icons['Egg-Burdened Butterfly']
    const without = { ...data, instrumentIcons: icons }
    expect(readInstruments(later, layout(later), without).names).not.toContain('Egg-Burdened Butterfly')
    expect(readInstruments(later, layout(later), without, learned).names).toEqual(['Contracted Claws', 'Egg-Burdened Butterfly'])
  })
})
