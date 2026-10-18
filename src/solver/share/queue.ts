// Snapshots wait in this browser until they're sent in batches; a failed send is retried later, and boards
// left unsent when the tab closed go with the next visit.
import type { Snapshot } from './snapshot'

const KEY = 'vorax.share.queue'
const BATCH = 10
const MAX = 300
const QUIET_MS = 20_000
const RETRY_MIN = 5_000
const RETRY_MAX = 300_000

function load(): Snapshot[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function store(items: Snapshot[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // kept in memory only
  }
}

export function createQueue(o: { send(batch: Snapshot[]): Promise<boolean> }) {
  let items = load()
  let timer: ReturnType<typeof setTimeout> | null = null
  let sending = false
  let backoff = RETRY_MIN

  const schedule = (ms: number) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void flush(), ms)
  }

  async function flush(): Promise<void> {
    timer = null
    if (sending || !items.length) return
    sending = true
    const batch = items.slice(0, BATCH)
    let ok = false
    try {
      ok = await o.send(batch)
    } catch {
      ok = false
    }
    sending = false
    if (ok) {
      const sent = new Set(batch.map(s => s.uid))
      items = items.filter(s => !sent.has(s.uid))
      store(items)
      backoff = RETRY_MIN
      if (items.length >= BATCH) schedule(0)
    } else {
      schedule(backoff)
      backoff = Math.min(RETRY_MAX, backoff * 2)
    }
  }

  return {
    add(s: Snapshot) {
      items.push(s)
      if (items.length > MAX) items = items.slice(-MAX)
      store(items)
      if (sending) return
      schedule(items.length >= BATCH ? 0 : QUIET_MS)
    },
    flush,
    pending: () => items.length,
  }
}
