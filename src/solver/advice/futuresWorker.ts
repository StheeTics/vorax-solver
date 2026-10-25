import { playWork } from '@/strategy/advisor'
import { playWorkWasm } from '@/strategy/wasmFutures'
import { loadFutures } from './wasm'
import type { Slice } from './pool'

// started at once, so the WebAssembly is ready before the first board
const futures = loadFutures()

self.onmessage = async (e: MessageEvent<Slice & { id: number }>) => {
  const { id, work, from, to } = e.data
  const f = await futures
  self.postMessage({ id, tallies: f ? playWorkWasm(f, work, from, to) : playWork(work, from, to) })
}
