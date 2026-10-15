import { render, screen, fireEvent } from '@testing-library/react'
import { validateSetup, defaultRawSetup, type RawSetup } from '@/ui/sandboxValidate'
import { SandboxSetupScreen } from '@/ui/SandboxSetup'
import { createGame, dispatch, DEFAULT_SETTINGS } from '@/engine/game'

const withTank0 = (over: Partial<RawSetup['tanks'][number]>): RawSetup => {
  const raw = defaultRawSetup()
  raw.randomTanks = false
  raw.tanks[0] = { ...raw.tanks[0], empty: false, archetype: 'pest', rarity: 'rare', ...over }
  return raw
}
const tank0 = (raw: RawSetup) => {
  const r = validateSetup(raw)
  if ('error' in r) throw new Error(r.error)
  return r.setup.tanks![0]!
}

describe('validateSetup', () => {
  it('blank stats fall back to the rarity base', () => {
    expect(tank0(withTank0({ activity: '', quantity: '' }))).toMatchObject({ activity: 15, quantity: 12 })
  })
  it('clamps negatives to 1 and truncates fractions', () => {
    expect(tank0(withTank0({ activity: '-5', quantity: '2.7' }))).toMatchObject({ activity: 1, quantity: 2 })
  })
  it('rejects more than 3 instruments', () => {
    const raw = defaultRawSetup()
    raw.instruments = [1, 2, 3, 4].map(id => ({ id, acquiredRound: 1 }))
    expect('error' in validateSetup(raw)).toBe(true)
  })
  it('random start gives null tanks; clamps start round; drops unknown forced potions', () => {
    const raw = defaultRawSetup()
    raw.startRound = '99'
    raw.forcedHand = [12, 999]
    const r = validateSetup(raw)
    if ('error' in r) throw new Error(r.error)
    expect(r.setup.tanks).toBeNull()
    expect(r.setup.startRound).toBe(13)
    expect(r.setup.forcedHand).toEqual([12])
  })
  it('a start in round 12 never deals a potion hand', () => {
    const raw = defaultRawSetup()
    raw.startRound = '12'
    raw.instruments = [{ id: 1, acquiredRound: 1 }]
    const r = validateSetup(raw)
    if ('error' in r) throw new Error(r.error)
    let s = createGame(DEFAULT_SETTINGS, r.setup)
    let guard = 0
    while (s.phase !== 'gameOver' && guard++ < 20) {
      expect(s.hand.some(c => c.kind === 'potion')).toBe(false)
      s = dispatch(dispatch(s, { type: 'selectCard', index: 0 }).state, { type: 'confirm' }).state
    }
    expect(s.phase).toBe('gameOver')
  })
})

it('Reset to defaults empties every tank row', () => {
  render(<SandboxSetupScreen onStart={() => {}} onBack={() => {}} />)
  fireEvent.click(screen.getByLabelText('Random starting monsters'))
  fireEvent.click(screen.getByLabelText('Tank 1 occupied'))
  expect((screen.getByLabelText('Tank 1 occupied') as HTMLInputElement).checked).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }))
  for (let i = 1; i <= 6; i++) expect((screen.getByLabelText(`Tank ${i} occupied`) as HTMLInputElement).checked).toBe(false)
})

it('Start passes a validated setup and settings', () => {
  const onStart = vi.fn()
  render(<SandboxSetupScreen onStart={onStart} onBack={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  expect(onStart).toHaveBeenCalledTimes(1)
  const [setup, settings] = onStart.mock.calls[0]
  expect(setup.startRound).toBe(1)
  expect(settings.potionRefreshes).toBeLessThanOrEqual(3)
})

it('caps sandbox stats so Total Activity stays an exact integer', () => {
  const t = tank0(withTank0({ activity: '99999999999', quantity: '1e308' }))
  expect(Number.isSafeInteger(t.activity * t.quantity)).toBe(true)
})
