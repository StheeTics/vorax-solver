import { loadSource, saveSource } from '@/solver/sourceStore'

afterEach(() => vi.restoreAllMocks())

it('remembers the chosen source', () => {
  saveSource('screenshot')
  expect(loadSource()).toBe('screenshot')
})

it('sourceStore survives a throwing localStorage', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(['live', 'screenshot', 'manual']).toContain(loadSource())
})

it('falls back to manual when Live is unsupported (jsdom)', () => {
  localStorage.removeItem('vorax.solverSource')
  expect(loadSource()).toBe('manual')
})

it('a remembered live choice falls back to manual where Live is unsupported', () => {
  saveSource('live')
  expect(loadSource()).toBe('manual')
})
