// @vitest-environment node
import { BRANCH, fileShot, SHOTS, validateCard, validateShot, wanted, type Shot } from '../../worker/src/training'
import { memoryTraining } from './trainingStore'

const JPEG = '/9j/4AAQSkZJRgABAQ=='
const shot = (o: Partial<Shot> = {}): Shot => ({ uid: 'u-1234567890', phase: 'instrument', name: 'Egg-Burdened Butterfly', slot: 0, hand: ['Egg-Burdened Butterfly', 'Rawhide Restraint', 'Nettle Toggle'], why: 'rare', round: 4, ui: 0.957, picture: JPEG, ...o })

/** GitHub as far as fileShot uses it, recording each call. */
function github(o: { branch?: boolean; fail?: string } = {}) {
  const calls: { method: string; path: string; body?: Record<string, unknown> }[] = []
  let branch = o.branch ?? true
  let issues = 40
  const fetcher = async (url: string, init: RequestInit = {}) => {
    const path = url.replace('https://api.github.com/repos/tidewarden/vorax-training-data', '')
    const method = init.method ?? 'GET'
    const body = init.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : undefined
    calls.push({ method, path, body })
    const reply = (status: number, data: unknown = {}) => new Response(JSON.stringify(data), { status })
    if (o.fail && path.startsWith(o.fail)) return reply(500)
    if (path === `/git/ref/heads/${BRANCH}`) return branch ? reply(200) : reply(404)
    if (path === '/git/ref/heads/main') return reply(200, { object: { sha: 'abc' } })
    if (path === '/git/refs') return (branch = true), reply(201)
    if (path.startsWith('/contents/')) return reply(201)
    if (path === '/issues') return reply(201, { number: ++issues })
    if (/^\/issues\/\d+\/comments$/.test(path)) return reply(201)
    return reply(404)
  }
  return { calls, fetcher }
}

describe('what the collector accepts', () => {
  it('a card it knows by name, and nothing else', () => {
    expect(validateCard({ phase: 'instrument', name: 'Egg-Burdened Butterfly' })).toEqual({ phase: 'instrument', name: 'Egg-Burdened Butterfly' })
    expect(validateCard({ phase: 'potion', text: 'The Holiest Wa' })).toBeNull()
    expect(validateCard({ phase: 'potion', name: 'Not A Card' })).toBeNull()
    expect(validateCard({ phase: 'boss', name: 'Egg-Burdened Butterfly' })).toBeNull()
  })
  it('a screenshot only as a JPEG, with a sane slot and hand', () => {
    expect(validateShot(shot())).toMatchObject({ name: 'Egg-Burdened Butterfly', slot: 0 })
    expect(validateShot({ ...shot(), picture: 'iVBORw0KGgo=' })).toBeNull()
    expect(validateShot({ ...shot(), picture: '/9j/<script>' })).toBeNull()
    expect(validateShot({ ...shot(), slot: 7 })).toBeNull()
    expect(validateShot({ ...shot(), hand: ['a', 'b', 'c', 'd', 'e', 'f'] })).toBeNull()
    // the interface scale the game logged: a screenshot without it can't be cut right, so it's refused
    expect(validateShot({ ...shot(), ui: undefined })).toBeNull()
    expect(validateShot({ ...shot(), ui: 9 })).toBeNull()
    expect(validateShot(shot({ ui: 1.0945 }))).toMatchObject({ ui: 1.0945 })
    expect(validateShot({ ...shot(), why: 'because' })).toBeNull()
  })
})

describe('one issue per card, three screenshots each', () => {
  it('the first screenshot makes the branch if needed, saves the picture and opens "Training Data: <name>"', async () => {
    const store = memoryTraining()
    const gh = github({ branch: false })
    expect(await fileShot(store, shot(), 'token', gh.fetcher)).toEqual({ filed: true, issue: 41 })
    expect(gh.calls.map(c => `${c.method} ${c.path.replace(/\/contents\/.*/, '/contents/…')}`)).toEqual([`GET /git/ref/heads/${BRANCH}`, 'GET /git/ref/heads/main', 'POST /git/refs', 'PUT /contents/…', 'POST /issues'])
    const issue = gh.calls.at(-1)!.body!
    expect(issue.title).toBe('Training Data: Egg-Burdened Butterfly')
    expect(issue.body).toContain(`/blob/${BRANCH}/training-data/egg-burdened-butterfly/`)
    expect(issue.body).toContain('"slot": 0')
    expect(gh.calls[3].body).toMatchObject({ content: JPEG, branch: BRANCH })
    expect(store.rows.get('instrument:Egg-Burdened Butterfly')).toMatchObject({ issue: 41, shots: 1 })
  })
  it('later screenshots of the card are comments on its issue, and after three it is no longer wanted', async () => {
    const store = memoryTraining()
    const gh = github()
    await fileShot(store, shot(), 'token', gh.fetcher)
    for (let i = 1; i < SHOTS; i++) expect(await fileShot(store, shot({ uid: `u-${i}` }), 'token', gh.fetcher)).toEqual({ filed: true, issue: 41 })
    expect(gh.calls.filter(c => c.path === '/issues')).toHaveLength(1)
    expect(gh.calls.filter(c => c.path === '/issues/41/comments')).toHaveLength(SHOTS - 1)
    expect(await wanted(store, { phase: 'instrument', name: 'Egg-Burdened Butterfly' })).toBe(false)
    expect((await fileShot(store, shot({ uid: 'u-late' }), 'token', gh.fetcher)).filed).toBe(false)
  })
  it('no daily limit on new cards: every card that reads badly may open its issue', async () => {
    const store = memoryTraining()
    const gh = github()
    const instruments = ['Aberrant Stinger', 'Chrysalis Specimen', 'Egg-Burdened Butterfly', 'Eyelid Speculum', 'Lady of the Plague Quarter', 'Canine Teeth File', 'Rawhide Restraint', 'Nettle Toggle', 'Sinew Garrote', 'Fouled Scraper', 'Contracted Claws', 'Incubation Sac']
    for (const name of instruments) expect(await fileShot(store, shot({ name, uid: name }), 'token', gh.fetcher)).toMatchObject({ filed: true })
    expect(gh.calls.filter(c => c.path === '/issues')).toHaveLength(instruments.length)
  })
  it('a card whose issue failed to open is wanted again, not stuck', async () => {
    const store = memoryTraining()
    expect((await fileShot(store, shot(), 'token', github({ fail: '/issues' }).fetcher)).filed).toBe(false)
    expect(store.rows.size).toBe(0)
    expect(await wanted(store, { phase: 'instrument', name: 'Egg-Burdened Butterfly' })).toBe(true)
  })
  it('a card whose issue another upload is still opening is not filed twice', async () => {
    const store = memoryTraining()
    await store.claimTraining('instrument:Egg-Burdened Butterfly', 'Training Data: Egg-Burdened Butterfly', new Date().toISOString())
    expect(await fileShot(store, shot(), 'token', github().fetcher)).toEqual({ filed: false, why: 'not wanted' })
    expect(await wanted(store, { phase: 'instrument', name: 'Egg-Burdened Butterfly' })).toBe(false)
  })
})
