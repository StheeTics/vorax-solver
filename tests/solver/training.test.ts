import { sendTraining, trainingKey, trainingWanted } from '@/solver/share/training'
import { emptyState, type Reading } from '@/solver/types'

const reading = (o: { phase?: 'potion' | 'instrument'; hand: string[]; steps: number[]; unknown?: { slot: number; text: string }[] }): Reading => ({
  state: { ...emptyState(), phase: o.phase ?? 'instrument', round: 4, hand: o.hand },
  fields: Object.fromEntries(o.hand.map((n, j) => [`hand${j}`, { sure: true, guess: n }])),
  problems: (o.unknown ?? []).map(u => ({ kind: 'unknownArt' as const, field: `hand${u.slot}`, crop: { x: 0, y: 0, w: 1, h: 1 }, text: u.text })),
  timing: { steps: o.steps },
})

describe('which cards a screenshot is wanted for', () => {
  it('a card the reader has fewer than 3 pictures of, however it was read', () => {
    const r = reading({ hand: ['Egg-Burdened Butterfly', 'Rawhide Restraint', 'Nettle Toggle'], steps: [0, 0, 1] })
    expect(trainingWanted(r)).toEqual([{ phase: 'instrument', slot: 0, name: 'Egg-Burdened Butterfly', why: 'rare' }])
  })
  it('a card neither its picture nor its title settled quickly', () => {
    const r = reading({ phase: 'potion', hand: ['Green Bile Solution', 'Anesthetic Tincture - Agito', 'Slough Solution'], steps: [1, 2, 0] })
    expect(trainingWanted(r)).toEqual([{ phase: 'potion', slot: 1, name: 'Anesthetic Tincture - Agito', why: 'slow' }])
  })
  it('nothing for a card the reader has no name for, however it was read', () => {
    const r = reading({ phase: 'potion', hand: ['Brain Fog Tincture', '', 'Targeted Xeno-Hormone'], steps: [1, 4, 1], unknown: [{ slot: 1, text: 'The Holiest Water' }] })
    expect(trainingWanted(r)).toEqual([])
  })
  it('nothing from a picture caught mid-animation or without the board', () => {
    const r = reading({ hand: ['Egg-Burdened Butterfly'], steps: [0] })
    expect(trainingWanted({ ...r, problems: [{ kind: 'animating' }] })).toEqual([])
  })
  it('a card is the same card however its title was read', () => {
    expect(trainingKey({ phase: 'potion', text: 'The Holiest Water\nAll' })).toBe(trainingKey({ phase: 'potion', text: 'The Holiest Water | All' }))
  })
})

describe('sending', () => {
  const r = reading({ hand: ['Egg-Burdened Butterfly', 'Rawhide Restraint', 'Nettle Toggle'], steps: [0, 0, 1] })
  const img = { width: 4, height: 4 } as ImageData
  beforeEach(() => localStorage.clear())
  const deps = (want: boolean, posts: { url: string; body: Record<string, unknown> }[], on = true) => ({
    on,
    allowed: true,
    endpoint: 'https://collector',
    build: 'abc1234',
    jpeg: async () => '/9j/AAAA',
    post: (async (url: string, init: RequestInit) => {
      posts.push({ url, body: JSON.parse(init.body as string) })
      return new Response(JSON.stringify({ want }), { status: 200 })
    }) as typeof fetch,
  })

  it('asks first, then sends the screenshot with the hand and the card’s slot', async () => {
    const posts: { url: string; body: Record<string, unknown> }[] = []
    await sendTraining(img, r, trainingWanted(r), deps(true, posts))
    expect(posts.map(p => p.url)).toEqual(['https://collector/v1/training/ask', 'https://collector/v1/training'])
    expect(posts[0].body).toEqual({ phase: 'instrument', name: 'Egg-Burdened Butterfly' })
    expect(posts[1].body).toMatchObject({ phase: 'instrument', name: 'Egg-Burdened Butterfly', slot: 0, hand: ['Egg-Burdened Butterfly', 'Rawhide Restraint', 'Nettle Toggle'], why: 'rare', round: 4, ui: 1, build: 'abc1234', picture: '/9j/AAAA' })
  })
  it('sends nothing the collector doesn’t want, and asks about a card once per install', async () => {
    const posts: { url: string; body: Record<string, unknown> }[] = []
    await sendTraining(img, r, trainingWanted(r), deps(false, posts))
    await sendTraining(img, r, trainingWanted(r), deps(true, posts))
    expect(posts.map(p => p.url)).toEqual(['https://collector/v1/training/ask'])
  })
  it('nothing at all with sharing off', async () => {
    const posts: { url: string; body: Record<string, unknown> }[] = []
    await sendTraining(img, r, trainingWanted(r), deps(true, posts, false))
    expect(posts).toEqual([])
  })
})
