import { BASIC_POOL } from '@/data/instruments'
import { rainbowScore, RAINBOW, refreshingPriorPicker, PRIOR } from '@/strategy/bot'
import { createGame, DEFAULT_SETTINGS } from '@/engine/game'
import { VIAL_LEVELS } from '@/engine/rewards'

describe('scoring a playout by the goal: rainbow first, then the vial tier reached', () => {
  it('any rainbow beats any score short of it', () => {
    expect(rainbowScore(RAINBOW)).toBeGreaterThan(rainbowScore(RAINBOW - 1) + 50)
    expect(rainbowScore(RAINBOW)).toBe(rainbowScore(RAINBOW * 5))
  })
  it('short of rainbow, each vial step counts one', () => {
    expect(rainbowScore(VIAL_LEVELS[6])).toBe(rainbowScore(VIAL_LEVELS[5]) + 1)
    expect(rainbowScore(0)).toBe(0)
    expect(rainbowScore(VIAL_LEVELS[11])).toBe(12)
  })
})

describe('instrument picks inside playouts', () => {
  const offer = (ids: number[], refreshes: number) => {
    const s = createGame({ ...DEFAULT_SETTINGS, instrumentRefreshes: refreshes }, undefined, 1)
    return { ...s, phase: 'instrumentSelect' as const, hand: ids.map(id => ({ kind: 'instrument' as const, id })), instrumentRefreshes: refreshes }
  }
  it('take the strongest offered instrument', () => {
    const [weak1, weak2] = BASIC_POOL.map(d => d.id).sort((a, b) => PRIOR[a] - PRIOR[b])
    const strongest = BASIC_POOL.map(d => d.id).sort((a, b) => PRIOR[b] - PRIOR[a])[0]
    expect(refreshingPriorPicker(offer([weak1, strongest, weak2], 2), 1)).toBe(1)
  })
  it('refresh a weak offer while refreshes are left, so a saved refresh is worth something', () => {
    const weakBasics = BASIC_POOL.map(d => d.id).sort((a, b) => PRIOR[a] - PRIOR[b]).slice(0, 3)
    expect(refreshingPriorPicker(offer(weakBasics, 2), 1)).toBe('refresh')
    expect(refreshingPriorPicker(offer(weakBasics, 0), 1)).not.toBe('refresh')
  })
})

describe('ranking an instrument offer', () => {
  it('scores each option by the goal (rainbow worth 100, else vial steps), not the raw score', async () => {
    const { rankInstruments, evChooser } = await import('@/strategy/bot')
    const s = createGame(DEFAULT_SETTINGS, undefined, 3)
    const offer = { ...s, phase: 'instrumentSelect' as const, hand: [1, 2, 3].map(id => ({ kind: 'instrument' as const, id })) }
    const { offers, refresh } = rankInstruments(offer, 5, 2, evChooser({ samples: 1, horizon: 0 }))
    for (const v of [...offers, refresh ?? 0]) expect(v).toBeLessThanOrEqual(100)
  })
})
