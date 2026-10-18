import { shareIcon } from '@/solver/share/icon'

const pattern = Array.from({ length: 576 }, (_, i) => (i % 2 ? 0.0417 : -0.0417))

it('sends the name and the icon pattern when sharing is on, from the published site', async () => {
  const post = vi.fn(async () => new Response('{}'))
  await shareIcon('Egg-Burdened Butterfly', pattern, { on: true, allowed: true, endpoint: 'https://w.dev', post })
  expect(post).toHaveBeenCalledTimes(1)
  const [url, init] = post.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe('https://w.dev/v1/icons')
  const body = JSON.parse(init.body as string)
  expect(body.name).toBe('Egg-Burdened Butterfly')
  expect(body.pattern).toHaveLength(576)
  expect(body.uid).toMatch(/^[0-9a-f-]{36}$/)
  expect(Object.keys(body).sort()).toEqual(['name', 'pattern', 'uid'])
})

it('sends nothing with sharing off or away from the published site', async () => {
  const post = vi.fn(async () => new Response('{}'))
  await shareIcon('Egg-Burdened Butterfly', pattern, { on: false, allowed: true, endpoint: 'https://w.dev', post })
  await shareIcon('Egg-Burdened Butterfly', pattern, { on: true, allowed: false, endpoint: 'https://w.dev', post })
  expect(post).not.toHaveBeenCalled()
})

it('a failed send is quiet', async () => {
  await expect(shareIcon('Egg-Burdened Butterfly', pattern, { on: true, allowed: true, endpoint: 'https://w.dev', post: async () => { throw new Error('offline') } })).resolves.toBeUndefined()
})
