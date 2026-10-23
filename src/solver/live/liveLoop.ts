// Following the log and deciding when to snap, without timers of its own: the Worker (or the page)
// calls poll() every POLL_MS and check() every CHECK_MS.
import type { Follower } from './logFollower'
import { classify, createSettler, DEFAULT_RULES, type SettledBy, type TriggerRules } from './triggers'

export const POLL_MS = 250
export const CHECK_MS = 50

export type LiveEvent =
  /** why: for a board or screen, why it counted as settled (numbers landed and clicks need no second look) */
  | { type: 'snap'; kind: 'board' | 'screen' | 'manual'; triggerAt: number; lines: string[]; why?: SettledBy }
  /** a new board or screen came in, the moment its line is read: its cards are dealt long before it settles */
  | { type: 'changed'; kind: 'board' | 'screen'; at: number }
  | { type: 'status'; detailSeen: boolean; refreshes: number; over: boolean; lines: number }
  /** the capture-mode clock (TICK_MS), kept off the page so a background tab isn't throttled */
  | { type: 'tick' }

export function createLiveLoop(o: { follower: Follower; now: () => number; post: (e: LiveEvent) => void; rules?: TriggerRules }) {
  const rules = o.rules ?? DEFAULT_RULES
  const settler = createSettler(rules)
  let trigger: { at: number; lines: string[] } | null = null
  let total = 0

  return {
    async poll() {
      const lines = await o.follower.poll()
      const t = o.now()
      for (const line of lines) {
        const kind = classify(line, rules)
        if ((kind === 'board' && !settler.over) || kind === 'screen') {
          trigger = { at: t, lines: [line] }
          o.post({ type: 'changed', kind, at: t })
        }
        else if (kind && trigger) trigger.lines.push(line)
      }
      settler.feed(lines, t)
      total += lines.length
      o.post({ type: 'status', detailSeen: o.follower.detailSeen, refreshes: settler.refreshes, over: settler.over, lines: total })
    },
    check() {
      const kind = settler.due(o.now())
      if (kind) o.post({ type: 'snap', kind, triggerAt: trigger?.at ?? o.now(), lines: trigger?.lines ?? [], why: settler.settledBy ?? undefined })
    },
    snapNow() {
      o.post({ type: 'snap', kind: 'manual', triggerAt: o.now(), lines: [] })
    },
    cancel() {
      settler.cancel()
    },
  }
}
