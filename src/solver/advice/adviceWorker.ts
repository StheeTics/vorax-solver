import type { ScreenState } from '@/strategy/advisor'
import { runAdvice } from './runAdvice'

self.onmessage = (e: MessageEvent<{ id: number; state: ScreenState }>) => {
  const { id, state } = e.data
  runAdvice(state, advice => self.postMessage({ id, advice }))
}
