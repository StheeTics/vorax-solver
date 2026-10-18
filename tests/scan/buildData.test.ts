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
