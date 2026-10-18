import { existsSync, readFileSync } from 'node:fs'
import { decodePng } from '../../scripts/scan/png'
import { buildData } from '../../scripts/scan/buildData'

const local = existsSync('training/g3-ticks/085-tick.png')

describe.skipIf(!local)('card-only labels (tick frames)', () => {
  it('teach the cards in the hand and nothing else', () => {
    const img = decodePng(readFileSync('training/g3-ticks/085-tick.png'))
    const data = buildData([{ img, label: { kind: 'cards', cards: { phase: 'potion', hand: ['Rousing Salts', 'Anesthetic Tincture - Agito', 'Twin Hormone - Bone Sentry'] } } }])
    expect(Object.keys(data.cards).sort()).toEqual(['potion:Anesthetic Tincture - Agito', 'potion:Rousing Salts', 'potion:Twin Hormone - Bone Sentry'])
    expect(Object.keys(data.texts)).toHaveLength(3)
    expect(data.headers).toEqual({})
    expect(data.instrumentIcons).toEqual({})
    expect(data.frames).toBe(0)
  })
})

describe.skipIf(!local)('hand-only labels with the equipped instruments', () => {
  it('also teach the panel icons', () => {
    const img = decodePng(readFileSync('training/g3-ticks/085-tick.png'))
    const data = buildData([{ img, label: { kind: 'cards', cards: { phase: 'potion', hand: ['Rousing Salts', 'Anesthetic Tincture - Agito', 'Twin Hormone - Bone Sentry'], instruments: ['Contracted Claws', 'Rawhide Restraint', 'Canine Teeth File'] } } }])
    expect(Object.keys(data.instrumentIcons).sort()).toEqual(['Canine Teeth File', 'Contracted Claws', 'Rawhide Restraint'])
  })
})

describe.skipIf(!existsSync('training/h1-013-screen.png'))('a frame whose instrument panel shows something unknown', () => {
  it('teaches the board but no panel icons', () => {
    const truth = JSON.parse(readFileSync('scripts/scan/truth.json', 'utf8'))
    const img = decodePng(readFileSync('training/h1-013-screen.png'))
    const data = buildData([{ img, label: truth['h1-013-screen.png'] }])
    expect(Object.keys(data.digits.label).length).toBeGreaterThan(5)
    expect(data.instrumentIcons).toEqual({})
  })
})

describe.skipIf(!existsSync('training/h1-013-screen.png'))('digit examples from different screen sizes', () => {
  it('each size keeps its own, so a smaller screen is learned even when the larger ones filled the list', () => {
    const truth = JSON.parse(readFileSync('scripts/scan/truth.json', 'utf8'))
    const big = Object.entries(truth).filter(([f, v]) => (v as { state?: unknown }).state && /^(00|01|02)\d-board\.png$/.test(f)).slice(0, 14)
    const frames = [...big, ['h1-013-screen.png', truth['h1-013-screen.png']]].map(([f, label]) => ({ img: decodePng(readFileSync(`training/${f as string}`)), label: label as never }))
    const data = buildData(frames)
    expect(data.digits.label['6'].length).toBeGreaterThan(8)
    const withoutSmall = buildData(frames.slice(0, -1))
    expect(withoutSmall.digits.label['6'].length).toBeLessThanOrEqual(8)
  })
})
