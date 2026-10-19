// @vitest-environment node
import { onSchedule, SCHEDULE } from '../../worker/src/schedule'

describe('the collector starts the repo’s loops on time (GitHub’s own scheduler proved unreliable)', () => {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = vi.fn(async (url: string, init: RequestInit) => (calls.push({ url, init }), new Response(null, { status: 204 })))
  beforeEach(() => (calls.length = 0))

  it('the odds job every hour, the issue fixer every hour, the daily check once a day', () => {
    expect(SCHEDULE).toEqual({ '3 * * * *': ['live-data.yml'], '33 * * * *': ['issue-fixer.yml'], '45 6 * * *': ['daily-check.yml'] })
  })

  it('asks GitHub to start each workflow due, on main, with the dispatch token', async () => {
    await onSchedule('3 * * * *', { GITHUB_DISPATCH_TOKEN: 'tok' }, fetch as never)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://api.github.com/repos/tidewarden/tli-vorax-simulator/actions/workflows/live-data.yml/dispatches')
    expect(calls[0].init.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ ref: 'main' })
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer tok')
  })

  it('does nothing without the token, or for a time with nothing due', async () => {
    await onSchedule('3 * * * *', {}, fetch as never)
    await onSchedule('59 * * * *', { GITHUB_DISPATCH_TOKEN: 'tok' }, fetch as never)
    expect(calls).toHaveLength(0)
  })
})
