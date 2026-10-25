// The advice's futures in WebAssembly (wasm/, built into src/strategy/futures.wasm by `npm run wasm`): ~12x faster than
// the JavaScript, the same futures to the last total, so the advice can play many more of them. Loaded once per
// worker with the current odds and board value; where it can't load, the JavaScript plays the futures instead.
import wasmUrl from '@/strategy/futures.wasm?url'
import { WasmFutures } from '@/strategy/wasmFutures'
import { LIVE_WEIGHTS } from '@/data/liveWeights'
import { currentBoardValue } from '@/strategy/value'

let loading: Promise<WasmFutures | null> | null = null
export function loadFutures(): Promise<WasmFutures | null> {
  loading ??= (async () => {
    try {
      if (typeof WebAssembly === 'undefined') return null
      const f = await WasmFutures.load(await (await fetch(wasmUrl)).arrayBuffer())
      f.setOdds(LIVE_WEIGHTS)
      f.setModel(currentBoardValue())
      return f
    } catch (e) {
      console.error('[advice] WebAssembly futures unavailable, the JavaScript plays them', e)
      return null
    }
  })()
  return loading
}

/** Whether the workers will play the futures in WebAssembly (they load the same file): decides how many to play. */
export const wasmFutures = async () => (await loadFutures()) !== null
