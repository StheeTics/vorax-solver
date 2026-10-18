import { NotAWindowError, shareWindow } from '@/solver/live/windowCapture'

function fakeMedia(surface: string) {
  const listeners: Record<string, (() => void)[]> = {}
  const track = {
    getSettings: () => ({ displaySurface: surface, width: 1920, height: 1080 }),
    stop: vi.fn(),
    addEventListener: (name: string, fn: () => void) => (listeners[name] ??= []).push(fn),
  }
  const stream = { getVideoTracks: () => [track], getTracks: () => [track] }
  const md = { getDisplayMedia: vi.fn(async () => stream) } as unknown as MediaDevices
  return { md, track, fire: (name: string) => listeners[name]?.forEach(f => f()) }
}

it('asks for a window and no audio', async () => {
  const { md } = fakeMedia('window')
  await shareWindow(md)
  expect(md.getDisplayMedia).toHaveBeenCalledWith({ video: { displaySurface: 'window', frameRate: 30 }, audio: false })
})

it('rejects a screen share and stops it', async () => {
  const { md, track } = fakeMedia('monitor')
  await expect(shareWindow(md)).rejects.toBeInstanceOf(NotAWindowError)
  expect(track.stop).toHaveBeenCalled()
})

it('reports the window size', async () => {
  const { md } = fakeMedia('window')
  expect((await shareWindow(md)).size).toEqual({ width: 1920, height: 1080 })
})

it('onEnded fires when the browser stops the share', async () => {
  const { md, fire } = fakeMedia('window')
  const share = await shareWindow(md)
  const ended = vi.fn()
  share.onEnded(ended)
  fire('ended')
  expect(ended).toHaveBeenCalled()
})

it('stop ends the track', async () => {
  const { md, track } = fakeMedia('window')
  const share = await shareWindow(md)
  share.stop()
  expect(track.stop).toHaveBeenCalled()
})
