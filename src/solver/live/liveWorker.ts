// Runs the log follower off the page, so a background tab still keeps up with the game.
import { createFollower, type FileLike } from './logFollower'
import { CHECK_MS, createLiveLoop, POLL_MS } from './liveLoop'
import { TICK_MS } from './captureMode'
import type { TriggerRules } from './triggers'

let stop: (() => void) | null = null
let loopRef: ReturnType<typeof createLiveLoop> | null = null

self.onmessage = (e: MessageEvent<{ type: 'start'; handle: FileLike; rules: TriggerRules } | { type: 'stop' } | { type: 'snapNow' } | { type: 'cancel' }>) => {
  const m = e.data
  if (m.type === 'start') {
    stop?.()
    const loop = createLiveLoop({ follower: createFollower(m.handle), now: () => Date.now(), post: ev => self.postMessage(ev), rules: m.rules })
    let busy = false
    const p = setInterval(async () => {
      if (busy) return
      busy = true
      try {
        await loop.poll()
      } finally {
        busy = false
      }
    }, POLL_MS)
    const c = setInterval(() => loop.check(), CHECK_MS)
    const k = setInterval(() => self.postMessage({ type: 'tick' }), TICK_MS)
    stop = () => {
      clearInterval(p)
      clearInterval(c)
      clearInterval(k)
    }
    loopRef = loop
  } else if (m.type === 'stop') {
    stop?.()
    stop = null
    loopRef = null
  } else if (m.type === 'snapNow') {
    loopRef?.snapNow()
  } else if (m.type === 'cancel') {
    loopRef?.cancel()
  }
}
