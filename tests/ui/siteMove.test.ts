// The old address (GitHub Pages) sends visitors on to the new one (Cloudflare Pages), with what they saved.
import { arriveFromOldSite, decodeCarried, encodeCarried, leaveOldSite, MAX_CARRIED, newAddress, startPage, type Carried } from '@/ui/siteMove'

const at = (href: string) => {
  const u = new URL(href)
  return { hostname: u.hostname, pathname: u.pathname, search: u.search, hash: u.hash, replace: vi.fn() } as unknown as Location & { replace: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  localStorage.clear()
  delete (window as { VoraxDesktop?: unknown }).VoraxDesktop
})

describe('the address it sends to', () => {
  it('is the same page and options at the new address, without .html', () => {
    expect(newAddress(at('https://tidewarden.github.io/tli-vorax-simulator/solver.html?board=abc&capture'), 'X'))
      .toBe('https://voraxlab.pages.dev/tli-vorax-simulator/solver?board=abc&capture#vorax-move=X')
    expect(newAddress(at('https://tidewarden.github.io/tli-vorax-simulator/'), 'X')).toBe('https://voraxlab.pages.dev/tli-vorax-simulator/#vorax-move=X')
  })
})

describe('what travels with the visitor', () => {
  it('comes back as it went, any text included', () => {
    const c = { local: { 'vorax.shelleyLevel': '4', 'vorax.note': 'Xenopanacea · “ok” ✓' }, refs: { 'card:X': [{ a: 1 }] } } as unknown as Carried
    expect(decodeCarried(encodeCarried(c))).toEqual(c)
  })
  it('keeps to a safe length: when the unsent boards don’t fit, only the newest that do go', () => {
    const queue = Array.from({ length: 300 }, (_, i) => ({ uid: String(i), pad: 'x'.repeat(1300) }))
    const c = { local: { 'vorax.share.queue': JSON.stringify(queue), 'vorax.install': 'abc' }, refs: {} }
    const s = encodeCarried(c)
    expect(s.length).toBeLessThanOrEqual(MAX_CARRIED)
    const back = decodeCarried(s)!
    const kept = JSON.parse(back.local['vorax.share.queue']) as { uid: string }[]
    expect(kept.length).toBeGreaterThan(0)
    expect(kept[kept.length - 1].uid).toBe('299')
    expect(back.local['vorax.install']).toBe('abc')
  })
  it('isn’t trusted when it isn’t one', () => {
    expect(decodeCarried('not base64 json')).toBeNull()
  })
})

describe('leaving the old address', () => {
  it('sends the visitor on with what they saved', async () => {
    localStorage.setItem('vorax.shelleyLevel', '5')
    const loc = at('https://tidewarden.github.io/tli-vorax-simulator/solver.html')
    expect(await leaveOldSite(loc)).toBe(true)
    const to = String(loc.replace.mock.calls[0][0])
    expect(to.startsWith('https://voraxlab.pages.dev/tli-vorax-simulator/solver#vorax-move=')).toBe(true)
    expect(decodeCarried(to.split('#vorax-move=')[1])!.local).toEqual({ 'vorax.shelleyLevel': '5' })
  })
  it('never inside Vorax Overlay: the app moves itself, and leaving its address would leave it stuck', async () => {
    ;(window as { VoraxDesktop?: unknown }).VoraxDesktop = {}
    const loc = at('https://tidewarden.github.io/tli-vorax-simulator/solver.html')
    expect(await leaveOldSite(loc)).toBe(false)
    expect(loc.replace).not.toHaveBeenCalled()
  })
  it('never at any other address', async () => {
    for (const href of ['https://voraxlab.pages.dev/tli-vorax-simulator/solver', 'http://localhost:5173/tli-vorax-simulator/solver.html']) {
      const loc = at(href)
      expect(await leaveOldSite(loc)).toBe(false)
      expect(loc.replace).not.toHaveBeenCalled()
    }
  })
})

describe('arriving at the new address', () => {
  it('keeps what came, never over what was saved here, clears it from the address bar, and says so once', async () => {
    localStorage.setItem('vorax.shelleyLevel', '6')
    const replaceState = vi.spyOn(history, 'replaceState')
    const carried = encodeCarried({ local: { 'vorax.shelleyLevel': '4', 'vorax.install': 'abc' }, refs: {} })
    const loc = at(`https://voraxlab.pages.dev/tli-vorax-simulator/solver?board=x#vorax-move=${carried}`)
    expect(await arriveFromOldSite(loc)).toBe(1)
    expect(localStorage.getItem('vorax.shelleyLevel')).toBe('6')
    expect(localStorage.getItem('vorax.install')).toBe('abc')
    expect(replaceState).toHaveBeenCalledWith(null, '', '/tli-vorax-simulator/solver?board=x')
    expect(localStorage.getItem('vorax.movedNotice')).toBe('show')
  })
  it('reads what came before clearing the address bar: the real location changes with it', async () => {
    const carried = encodeCarried({ local: { 'vorax.install': 'abc' }, refs: {} })
    history.replaceState(null, '', `/tli-vorax-simulator/solver#vorax-move=${carried}`)
    expect(await arriveFromOldSite()).toBe(1)
    expect(localStorage.getItem('vorax.install')).toBe('abc')
    expect(location.hash).toBe('')
  })
  it('does nothing without anything carried', async () => {
    expect(await arriveFromOldSite(at('https://voraxlab.pages.dev/tli-vorax-simulator/solver#report'))).toBe(0)
    expect(localStorage.getItem('vorax.movedNotice')).toBeNull()
  })
})

describe('every page', () => {
  it('still starts when the move goes wrong, never a blank page', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    const render = vi.fn()
    history.replaceState(null, '', '/tli-vorax-simulator/solver#vorax-move=%%%')
    await startPage(render)
    expect(render).toHaveBeenCalledOnce()
    getItem.mockRestore()
  })
  it('starts as usual away from the old address, with the moved notice once after a move', async () => {
    localStorage.setItem('vorax.movedNotice', 'show')
    const render = vi.fn()
    await startPage(render)
    expect(render).toHaveBeenCalledOnce()
    const bar = document.querySelector('[role="status"]')!
    expect(bar.textContent).toContain('voraxlab.pages.dev')
    ;(bar.querySelector('button') as HTMLButtonElement).click()
    expect(localStorage.getItem('vorax.movedNotice')).toBe('seen')
    expect(document.querySelector('[role="status"]')).toBeNull()
  })
})
