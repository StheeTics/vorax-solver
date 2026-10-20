import { playWork } from '@/strategy/advisor'
import type { Slice } from './pool'

self.onmessage = (e: MessageEvent<Slice & { id: number }>) => {
  const { id, work, from, to } = e.data
  self.postMessage({ id, tallies: playWork(work, from, to) })
}
