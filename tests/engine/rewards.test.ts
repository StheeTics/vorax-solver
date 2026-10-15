import { VIAL_LEVELS, vialTiers, nextVial } from '@/engine/rewards'

const t = (s: string) => s.split(' ')

describe('vialTiers', () => {
  it('starts all white', () => {
    expect(vialTiers(0)).toEqual(t('white white white white white white'))
    expect(vialTiers(37999)).toEqual(t('white white white white white white'))
  })
  it('first purple at 38,000, upgrading left to right', () => {
    expect(vialTiers(38000)).toEqual(t('purple white white white white white'))
  })
  it('first red at 266,000 (all six purple before it)', () => {
    expect(vialTiers(265999)).toEqual(t('purple purple purple purple purple purple'))
    expect(vialTiers(266000)).toEqual(t('red purple purple purple purple purple'))
  })
  it('matches the in-game screenshot: 5 red + 1 purple just below 721,000', () => {
    expect(vialTiers(720999)).toEqual(t('red red red red red purple'))
    expect(vialTiers(721000)).toEqual(t('red red red red red red'))
  })
  it('known red breakpoints: 4th 512,000, 5th 607,000', () => {
    expect(vialTiers(512000).filter(v => v === 'red')).toHaveLength(4)
    expect(vialTiers(607000).filter(v => v === 'red')).toHaveLength(5)
  })
  it('rainbow at 1,120,000, and never more than one', () => {
    expect(vialTiers(1119999)).toEqual(t('red red red red red red'))
    expect(vialTiers(1120000)).toEqual(t('rainbow red red red red red'))
    expect(vialTiers(1e12).filter(v => v === 'rainbow')).toHaveLength(1)
  })
  it('levels are strictly increasing (13 steps)', () => {
    expect(VIAL_LEVELS).toHaveLength(13)
    for (let i = 1; i < VIAL_LEVELS.length; i++) expect(VIAL_LEVELS[i]).toBeGreaterThan(VIAL_LEVELS[i - 1])
  })
})

describe('nextVial', () => {
  it('shows the next vial step and the color it turns', () => {
    expect(nextVial(0)).toEqual({ value: 38000, tier: 'purple' })
    expect(nextVial(200000)).toEqual({ value: 266000, tier: 'red' })
    expect(nextVial(650000)).toEqual({ value: 721000, tier: 'red' })
    expect(nextVial(800000)).toEqual({ value: 1120000, tier: 'rainbow' })
  })
  it('nothing left after the rainbow', () => {
    expect(nextVial(2_000_000)).toBeNull()
  })
})
