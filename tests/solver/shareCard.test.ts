import { confirmUnknown, shareCard } from '@/solver/share/card'
import type { Problem } from '@/solver/types'

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

const unknown = (j: number): Problem => ({ kind: 'unknownArt', field: `hand${j}`, crop: { x: 0, y: 0, w: 10, h: 10 } })

it('shares an unrecognised card only once a second look still can’t name it, asking for that look', () => {
  // first look: the card's still sliding in, its face cut off
  const first = confirmUnknown(new Set(), 'potion', 3, [unknown(0)])
  expect(first.share).toEqual([])
  expect(first.relook).toBe(true)
  // the card landed and was read: nothing shared (issues #14-#20)
  const read = confirmUnknown(first.seen, 'potion', 3, [])
  expect(read.share).toEqual([])
  expect(read.relook).toBe(false)
  // a card that really is new: unrecognised on the second look too, shared once, no further look asked
  const again = confirmUnknown(first.seen, 'potion', 3, [unknown(0)])
  expect(again.share.map(p => p.field)).toEqual(['hand0'])
  expect(again.relook).toBe(false)
})

it('doesn’t take an unrecognised card in another round or slot for the same one', () => {
  const first = confirmUnknown(new Set(), 'potion', 3, [unknown(0)])
  expect(confirmUnknown(first.seen, 'potion', 4, [unknown(0)]).share).toEqual([])
  expect(confirmUnknown(first.seen, 'potion', 3, [unknown(1)]).share).toEqual([])
})
