import { changeGate, nextIndex, frameName, saveReading, isCaptureMode, saveFrame } from '@/solver/live/captureMode'

it('isCaptureMode reads the query string', () => {
  expect(isCaptureMode('?capture')).toBe(true)
  expect(isCaptureMode('?a=1&capture=1')).toBe(true)
  expect(isCaptureMode('')).toBe(false)
  expect(isCaptureMode('?captured')).toBe(false)
})

it('frameName pads to three digits', () => {
  expect(frameName(7, 'board')).toBe('007-board')
  expect(frameName(1234, 'screen')).toBe('1234-screen')
})

it('saveFrame writes png and json', async () => {
  const written: Record<string, unknown[]> = {}
  const dir = {
    getFileHandle: async (name: string, opts: { create: boolean }) => {
      expect(opts.create).toBe(true)
      return {
        createWritable: async () => ({
          write: async (d: unknown) => (written[name] ??= []).push(d),
          close: async () => {},
        }),
      }
    },
  } as unknown as FileSystemDirectoryHandle
  const meta = { lines: ['ProtoId = 5619'], triggerAt: 1, snappedAt: 2, width: 1280, height: 720 }
  await saveFrame(dir, 7, 'board', new Blob(['png']), meta)
  expect(Object.keys(written).sort()).toEqual(['007-board.json', '007-board.png'])
  expect(JSON.parse(written['007-board.json'][0] as string).width).toBe(1280)
})

it('the change gate keeps the first frame and then only changed ones', () => {
  const frame = (v: number) => ({ width: 96, height: 40, data: new Uint8ClampedArray(96 * 40 * 4).fill(v) }) as unknown as ImageData
  const gate = changeGate()
  expect(gate(frame(10))).toBe(true)
  expect(gate(frame(10))).toBe(false)
  expect(gate(frame(11))).toBe(false)
  expect(gate(frame(90))).toBe(true)
  expect(gate(frame(90))).toBe(false)
})

it('numbering carries on after the files already in the folder', () => {
  expect(nextIndex([])).toBe(0)
  expect(nextIndex(['001-screen.png', '001-screen.json', '002-board.png', 'notes.txt', '017-tick.jpg'])).toBe(17)
})

it('saveReading writes what the Solver read next to the frame', async () => {
  const written: Record<string, string> = {}
  const dir = {
    getFileHandle: async (name: string) => ({ createWritable: async () => ({ write: async (d: string) => void (written[name] = d), close: async () => {} }) }),
  } as unknown as FileSystemDirectoryHandle
  await saveReading(dir, 7, 'board', { state: { round: 3 }, problems: [] })
  expect(JSON.parse(written['007-board.reading.json']).state.round).toBe(3)
})

it('saveReading can save the advice beside the frame too', async () => {
  const written: Record<string, string> = {}
  const dir = {
    getFileHandle: async (name: string) => ({ createWritable: async () => ({ write: async (d: string) => void (written[name] = d), close: async () => {} }) }),
  } as unknown as FileSystemDirectoryHandle
  await saveReading(dir, 7, 'board', { best: 'refresh' }, 'advice')
  expect(JSON.parse(written['007-board.advice.json']).best).toBe('refresh')
})
