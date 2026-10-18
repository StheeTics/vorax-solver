import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ScreenshotSource } from '@/solver/screenshot/ScreenshotSource'
import { SolverApp } from '@/solver/SolverApp'
import { emptyState, type Reading } from '@/solver/types'

const pixels = { width: 1280, height: 720, data: new Uint8ClampedArray(1280 * 720 * 4) } as unknown as ImageData

beforeEach(() => {
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1280, height: 720, close() {} })))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage() {}, putImageData() {}, getImageData: () => pixels } as unknown as CanvasRenderingContext2D)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('choosing a file calls onFrame with its pixels', async () => {
  const onFrame = vi.fn()
  render(<ScreenshotSource onFrame={onFrame} />)
  const file = new File(['x'], 'shot.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText('Choose a screenshot'), { target: { files: [file] } })
  await waitFor(() => expect(onFrame).toHaveBeenCalledWith(expect.objectContaining({ width: 1280 })))
})

it('a pasted image calls onFrame', async () => {
  const onFrame = vi.fn()
  render(<ScreenshotSource onFrame={onFrame} />)
  const file = new File(['x'], 'shot.png', { type: 'image/png' })
  const paste = new Event('paste') as Event & { clipboardData: unknown }
  paste.clipboardData = { items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }] }
  act(() => void window.dispatchEvent(paste))
  await waitFor(() => expect(onFrame).toHaveBeenCalled())
})

it('the Solver fills the board from a reading', async () => {
  localStorage.setItem('vorax.solverSource', 'screenshot')
  const reading: Reading = {
    state: { ...emptyState(), tanks: [{ archetype: 'agito', rarity: 'boss', activity: 300, quantity: 1 }, null, null, null, null, null], hand: ['Xeno-Hormone'] },
    fields: { 'tank0.rarity': { sure: false, guess: 'boss' } },
    problems: [],
  }
  render(<SolverApp scanner={async () => reading} />)
  const file = new File(['x'], 'shot.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText('Choose a screenshot'), { target: { files: [file] } })
  await waitFor(() => expect((screen.getByLabelText('Tank 1 rarity') as HTMLSelectElement).value).toBe('boss'))
  expect(screen.getByTitle('Unsure: best guess boss')).toBeTruthy()
})

it('an unknown card shows What is this? and the report box', async () => {
  localStorage.setItem('vorax.solverSource', 'screenshot')
  const reading: Reading = {
    state: { ...emptyState(), hand: ['Xeno-Hormone'] },
    fields: { hand1: { sure: false } },
    problems: [{ kind: 'unknownArt', field: 'hand1', crop: { x: 0, y: 0, w: 4, h: 4 } }],
    frame: { width: 1280, height: 720 },
  }
  render(<SolverApp scanner={async () => reading} />)
  fireEvent.change(screen.getByLabelText('Choose a screenshot'), { target: { files: [new File(['x'], 's.png', { type: 'image/png' })] } })
  await waitFor(() => expect(screen.getByText('What is card 2?')).toBeTruthy())
  expect(screen.getByRole('link', { name: 'Open an issue on GitHub' })).toBeTruthy()
})

it('editing a field after a reading offers the quiet report link', async () => {
  localStorage.setItem('vorax.solverSource', 'screenshot')
  const reading: Reading = {
    state: { ...emptyState(), tanks: [{ archetype: 'agito', rarity: 'magic', activity: 5, quantity: 24 }, null, null, null, null, null], hand: ['Xeno-Hormone'] },
    fields: {},
    problems: [],
    frame: { width: 1280, height: 720 },
  }
  render(<SolverApp scanner={async () => reading} />)
  fireEvent.change(screen.getByLabelText('Choose a screenshot'), { target: { files: [new File(['x'], 's.png', { type: 'image/png' })] } })
  await waitFor(() => expect((screen.getByLabelText('Tank 1 rarity') as HTMLSelectElement).value).toBe('magic'))
  expect(screen.queryByText('Reading was wrong? Report it')).toBeNull()
  fireEvent.change(screen.getByLabelText('Tank 1 rarity'), { target: { value: 'rare' } })
  expect(screen.getByText('Reading was wrong? Report it')).toBeTruthy()
})

it('cards named in this browser can be forgotten', async () => {
  const refs = await import('@/solver/scan/localRefs')
  vi.spyOn(refs, 'loadLocalRefs').mockResolvedValue({ 'potion:Xeno-Hormone': [{ hist: [], grid: [] }] })
  const forget = vi.spyOn(refs, 'forgetLocalRefs').mockResolvedValue()
  render(<SolverApp scanner={async () => ({ state: emptyState(), fields: {}, problems: [] })} />)
  const button = await screen.findByRole('button', { name: 'Forget the 1 card I named' })
  fireEvent.click(button)
  await waitFor(() => expect(forget).toHaveBeenCalled())
  await waitFor(() => expect(screen.queryByRole('button', { name: /Forget the/ })).toBeNull())
})

it('an unknown card stays until it is named or skipped, even after the next board arrives', async () => {
  localStorage.setItem('vorax.solverSource', 'screenshot')
  const unknown: Reading = {
    state: { ...emptyState(), hand: ['Xeno-Hormone'] },
    fields: { hand1: { sure: false } },
    problems: [{ kind: 'unknownArt', field: 'hand1', crop: { x: 0, y: 0, w: 4, h: 4 } }],
    frame: { width: 1280, height: 720 },
  }
  const fine: Reading = { state: { ...emptyState(), hand: ['Xeno-Hormone'] }, fields: {}, problems: [], frame: { width: 1280, height: 720 } }
  const readings = [unknown, fine]
  render(<SolverApp scanner={async () => readings.shift() ?? fine} />)
  const pick = () => fireEvent.change(screen.getByLabelText('Choose a screenshot'), { target: { files: [new File(['x'], 's.png', { type: 'image/png' })] } })
  pick()
  await waitFor(() => expect(screen.getByText('What is card 2?')).toBeTruthy())
  pick()
  await waitFor(() => expect(readings).toHaveLength(0))
  expect(screen.getByText('What is card 2?')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
  expect(screen.queryByText('What is card 2?')).toBeNull()
})

it('an instrument corrected by the player stays corrected on the next board', async () => {
  localStorage.setItem('vorax.solverSource', 'screenshot')
  const panelSays = (): Reading => ({
    state: { ...emptyState(), round: 3, hand: ['Xeno-Hormone'], instruments: ['Aberrant Sprout'] },
    fields: { instrument0: { sure: true, guess: 'Aberrant Sprout' } },
    problems: [],
    instrumentRanks: [[['Aberrant Sprout', 0.99]]],
  })
  render(<SolverApp scanner={async () => panelSays()} />)
  const pick = () => fireEvent.change(screen.getByLabelText('Choose a screenshot'), { target: { files: [new File(['x'], 's.png', { type: 'image/png' })] } })
  pick()
  await waitFor(() => expect((screen.getByLabelText('Instrument 1') as HTMLSelectElement).value).toBe('Aberrant Sprout'))
  fireEvent.change(screen.getByLabelText('Instrument 1'), { target: { value: 'Black Goat Gut Suture' } })
  pick()
  await new Promise(r => setTimeout(r, 50))
  await waitFor(() => expect((screen.getByLabelText('Instrument 1') as HTMLSelectElement).value).toBe('Black Goat Gut Suture'))
})

it('the activation animation leaves the board and advice as they were, with no warning', async () => {
  localStorage.setItem('vorax.solverSource', 'screenshot')
  const board: Reading = { state: { ...emptyState(), round: 4, hand: ['Xeno-Hormone'] }, fields: {}, problems: [], frame: { width: 1, height: 1 } }
  const animating: Reading = { state: emptyState(), fields: {}, problems: [{ kind: 'animating' }], frame: { width: 1, height: 1 } }
  const readings = [board, animating]
  render(<SolverApp scanner={async () => readings.shift() ?? animating} />)
  const pick = () => fireEvent.change(screen.getByLabelText('Choose a screenshot'), { target: { files: [new File(['x'], 's.png', { type: 'image/png' })] } })
  pick()
  await waitFor(() => expect((screen.getByLabelText('Round') as HTMLInputElement).value).toBe('4'))
  pick()
  await waitFor(() => expect(readings).toHaveLength(0))
  await new Promise(r => setTimeout(r, 30))
  expect((screen.getByLabelText('Round') as HTMLInputElement).value).toBe('4')
  expect(screen.queryByText(/doesn’t look like the Surgical Preparation screen/)).toBeNull()
})

it('asks which instrument was picked, and the answer sets it', async () => {
  localStorage.setItem('vorax.solverSource', 'screenshot')
  const offer: Reading = { state: { ...emptyState(), phase: 'instrument', round: 2, hand: ['Egg-Burdened Butterfly', 'Rawhide Restraint', 'Vermicular Spinal Cord'], instruments: [] }, fields: {}, problems: [], instrumentRanks: [] }
  const after: Reading = { state: { ...emptyState(), round: 3, hand: ['Xeno-Hormone'], instruments: ['Hypertrophic Pituitary'] }, fields: {}, problems: [], instrumentRanks: [[['Hypertrophic Pituitary', 0.55], ['Rawhide Restraint', 0.4]]] }
  const readings = [offer, after]
  render(<SolverApp scanner={async () => readings.shift() ?? after} />)
  const pick = () => fireEvent.change(screen.getByLabelText('Choose a screenshot'), { target: { files: [new File(['x'], 's.png', { type: 'image/png' })] } })
  pick()
  await waitFor(() => expect(readings).toHaveLength(1))
  pick()
  await waitFor(() => expect(screen.getByText('Which instrument did you pick?')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: 'Egg-Burdened Butterfly' }))
  await waitFor(() => expect(screen.queryByText('Which instrument did you pick?')).toBeNull())
  expect((screen.getByLabelText('Instrument 1') as HTMLSelectElement).value).toBe('Egg-Burdened Butterfly')
})
