// The app's own code for the site's address: which page is the Solver, and moving what a player saved there.
import { createRequire } from 'node:module'

type Dump = { local: Record<string, string>; refs: Record<string, unknown> }
const { pageOf, dumpStorage, restoreStorage } = createRequire(import.meta.url)('../../desktop/lib/site.js') as {
  pageOf(url: string, site: string): string | null
  dumpStorage(idb?: unknown): Promise<Dump>
  restoreStorage(dump: unknown, idb?: unknown): Promise<number>
}

/** Just enough IndexedDB for one database of one store, with requests answering on the next tick like the real one. */
function fakeIdb(data = new Map<string, unknown>()) {
  const answer = <T>(value: () => T) => {
    const req: { result?: T; onsuccess?: () => void; onerror?: () => void } = {}
    setTimeout(() => ((req.result = value()), req.onsuccess?.()))
    return req
  }
  const store = {
    get: (k: string) => answer(() => data.get(k)),
    put: (v: unknown, k: string) => answer(() => void data.set(k, v)),
    openCursor() {
      const keys = [...data.keys()]
      let i = 0
      const req: { result?: unknown; onsuccess?: () => void; onerror?: () => void } = {}
      const step = () => setTimeout(() => ((req.result = i < keys.length ? { key: keys[i], value: data.get(keys[i]), continue: () => (i++, step()) } : null), req.onsuccess?.()))
      step()
      return req
    },
  }
  return { data, open: () => answer(() => ({ transaction: () => ({ objectStore: () => store }) })) }
}

const OLD = 'https://tidewarden.github.io/tli-vorax-simulator/'
const NEW = 'https://voraxlab.pages.dev/tli-vorax-simulator/'

describe('the Solver page, at either address', () => {
  it('is the same page with or without .html: Cloudflare Pages serves solver.html as /solver', () => {
    expect(pageOf(`${NEW}solver`, NEW)).toBe('solver')
    expect(pageOf(`${NEW}solver.html`, NEW)).toBe('solver')
    expect(pageOf(`${OLD}solver.html`, OLD)).toBe('solver')
    expect(pageOf(`${NEW}solver?x=1#y`, NEW)).toBe('solver')
  })
  it('isn’t from another address or folder', () => {
    expect(pageOf(`${OLD}solver.html`, NEW)).toBeNull()
    expect(pageOf('https://voraxlab.pages.dev/elsewhere/solver', NEW)).toBeNull()
    expect(pageOf('not a url', NEW)).toBeNull()
  })
})

describe('moving what a player saved to the new address', () => {
  beforeEach(() => localStorage.clear())
  it('takes everything the site saved, settings and named cards', async () => {
    localStorage.setItem('vorax.shelleyLevel', '4')
    localStorage.setItem('vorax.install', 'abc')
    const dump = await dumpStorage(fakeIdb(new Map([['card:Xeno', [{ a: 1 }]]])))
    expect(dump).toEqual({ local: { 'vorax.shelleyLevel': '4', 'vorax.install': 'abc' }, refs: { 'card:Xeno': [{ a: 1 }] } })
  })
  it('adds it at the new address without overwriting what was saved there', async () => {
    localStorage.setItem('vorax.shelleyLevel', '6')
    const idb = fakeIdb(new Map([['card:Kept', ['new']]]))
    const added = await restoreStorage({ local: { 'vorax.shelleyLevel': '4', 'vorax.share.queue': '[]' }, refs: { 'card:Kept': ['old'], 'card:Xeno': [{ a: 1 }] } }, idb)
    expect(added).toBe(2)
    expect(localStorage.getItem('vorax.shelleyLevel')).toBe('6')
    expect(localStorage.getItem('vorax.share.queue')).toBe('[]')
    expect(Object.fromEntries(idb.data)).toEqual({ 'card:Kept': ['new'], 'card:Xeno': [{ a: 1 }] })
  })
  it('works where there’s no IndexedDB, and with nothing to move', async () => {
    expect(await dumpStorage(null)).toEqual({ local: {}, refs: {} })
    expect(await restoreStorage({ local: {}, refs: {} }, null)).toBe(0)
    expect(await restoreStorage(null, null)).toBe(0)
  })
  it('runs from its own text, as the app hands it to each page', async () => {
    localStorage.setItem('vorax.share', 'off')
    const dump = await new Function(`return (${dumpStorage.toString()})(null)`)()
    expect(dump.local).toEqual({ 'vorax.share': 'off' })
  })
})
