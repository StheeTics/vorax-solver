import { shareCard } from '@/solver/share/card'

const deps = (post: typeof fetch, on = true, allowed = true) => ({ on, allowed, endpoint: 'https://w.dev', post })

it('sends a card it couldn’t name, its title as read and its picture, when sharing is on', async () => {
  const post = vi.fn(async () => new Response('{}'))
  await shareCard({ phase: 'potion', text: 'First Rite Holy Water: Confession\nThe throat is', picture: 'data:image/jpeg;base64,AAAA' }, deps(post))
  expect(post).toHaveBeenCalledTimes(1)
  const [url, init] = post.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe('https://w.dev/v1/cards')
  const body = JSON.parse(init.body as string)
  expect(Object.keys(body).sort()).toEqual(['phase', 'picture', 'text', 'uid'])
  expect(body.text).toMatch(/^First Rite Holy Water/)
})

it('sends each card once, however many boards show it', async () => {
  const post = vi.fn(async () => new Response('{}'))
  await shareCard({ phase: 'potion', text: 'A Card Never Seen\nflavour' }, deps(post))
  await shareCard({ phase: 'potion', text: 'A Card Never Seen\nother flavour' }, deps(post))
  await shareCard({ phase: 'potion', text: 'Another Card Never Seen' }, deps(post))
  expect(post).toHaveBeenCalledTimes(2)
})

it('sends nothing with sharing off, away from the published site, or with nothing to send', async () => {
  const post = vi.fn(async () => new Response('{}'))
  await shareCard({ phase: 'potion', text: 'Off Card' }, deps(post, false))
  await shareCard({ phase: 'potion', text: 'Local Card' }, deps(post, true, false))
  await shareCard({ phase: 'potion', text: '' }, deps(post))
  expect(post).not.toHaveBeenCalled()
})

it('a failed send is quiet', async () => {
  await expect(shareCard({ phase: 'potion', text: 'Offline Card' }, deps(async () => { throw new Error('offline') }))).resolves.toBeUndefined()
})
