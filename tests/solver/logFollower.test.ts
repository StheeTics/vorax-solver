import { createFollower, type FileLike } from '@/solver/live/logFollower'

/** An in-memory log file the test can append to, replace or delete. */
function fakeFile(initial: Uint8Array = new Uint8Array()) {
  let bytes = initial
  let gone = false
  const handle: FileLike = {
    async getFile() {
      if (gone) throw new Error('NotFoundError')
      const b = bytes
      return { size: b.length, slice: (a: number, z?: number) => ({ arrayBuffer: async () => b.slice(a, z).buffer }) }
    },
  }
  const enc = new TextEncoder()
  return {
    handle,
    append(s: string | Uint8Array) {
      const add = typeof s === 'string' ? enc.encode(s) : s
      const next = new Uint8Array(bytes.length + add.length)
      next.set(bytes)
      next.set(add, bytes.length)
      bytes = next
    },
    replace(s: string) {
      bytes = enc.encode(s)
    },
    remove() {
      gone = true
    },
    restore() {
      gone = false
    },
  }
}

it('first poll skips existing content', async () => {
  const f = fakeFile(new TextEncoder().encode('old line\n'.repeat(600_000)))
  const follower = createFollower(f.handle)
  expect(await follower.poll()).toEqual([])
})

it('returns only new complete lines', async () => {
  const f = fakeFile()
  const follower = createFollower(f.handle)
  await follower.poll()
  f.append('a\nb')
  expect(await follower.poll()).toEqual(['a'])
  f.append('c\n')
  expect(await follower.poll()).toEqual(['bc'])
})

it('strips the carriage return of Windows line endings', async () => {
  const f = fakeFile()
  const follower = createFollower(f.handle)
  await follower.poll()
  f.append('a\r\n')
  expect(await follower.poll()).toEqual(['a'])
})

it('multi-byte characters split across polls decode once', async () => {
  const f = fakeFile()
  const follower = createFollower(f.handle)
  await follower.poll()
  const bytes = new TextEncoder().encode('é\n')
  f.append(bytes.slice(0, 1))
  expect(await follower.poll()).toEqual([])
  f.append(bytes.slice(1))
  expect(await follower.poll()).toEqual(['é'])
})

it('truncation restarts from the new start', async () => {
  const f = fakeFile(new TextEncoder().encode('one\ntwo\nthree\n'))
  const follower = createFollower(f.handle)
  await follower.poll()
  f.replace('x\n')
  expect(await follower.poll()).toEqual(['x'])
})

it('a huge append reads only the last maxRead bytes', async () => {
  const f = fakeFile()
  const follower = createFollower(f.handle, { maxRead: 100 })
  await follower.poll()
  const lines = Array.from({ length: 100 }, (_, i) => `line-${String(i).padStart(3, '0')}`)
  f.append(lines.join('\n') + '\n')
  const got = await follower.poll()
  expect(got.length).toBeGreaterThan(0)
  expect(got.length).toBeLessThanOrEqual(11)
  expect(got[got.length - 1]).toBe('line-099')
  for (const l of got) expect(lines.slice(-11)).toContain(l)
})

it('missing file returns nothing and recovers', async () => {
  const f = fakeFile()
  const follower = createFollower(f.handle)
  await follower.poll()
  f.remove()
  expect(await follower.poll()).toEqual([])
  f.restore()
  f.append('back\n')
  expect(await follower.poll()).toEqual(['back'])
})

it('detailSeen flips on a TLLua line', async () => {
  const f = fakeFile()
  const follower = createFollower(f.handle)
  await follower.poll()
  f.append('LogStreaming: Display: nothing\n')
  await follower.poll()
  expect(follower.detailSeen).toBe(false)
  f.append('[2026.10.17-14.24.11:563][ 1]TLLua: Display: [Game] PushMgr:RecvPushCombineMsg ProtoId = 5619, SynId = 230\n')
  await follower.poll()
  expect(follower.detailSeen).toBe(true)
})
