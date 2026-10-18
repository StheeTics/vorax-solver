import { addLocalRef, loadLocalRefs } from '@/solver/scan/localRefs'

it('resolves {} when indexedDB is missing or throws', async () => {
  vi.stubGlobal('indexedDB', { open: () => { throw new Error('blocked') } })
  expect(await loadLocalRefs()).toEqual({})
  await expect(addLocalRef('potion:X', { hist: [], grid: [] })).resolves.toBeUndefined()
  vi.unstubAllGlobals()
})
