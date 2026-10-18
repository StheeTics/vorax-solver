import { useEffect, useRef } from 'react'
import type { FieldKey, Reading, Source } from '../types'
import { ENDPOINT, sendingAllowed } from './endpoint'
import { createQueue } from './queue'
import { loadShare } from './shareStore'
import { shareable, startsRun, toSnapshot, type Snapshot } from './snapshot'

const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev'

async function post(batch: Snapshot[]): Promise<boolean> {
  try {
    const res = await fetch(`${ENDPOINT}/v1/snapshots`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(batch), keepalive: true })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Shares each board read from a real screen, once the next one arrives (or the page closes), so the
 * player's corrections go with it.
 */
export function useShare(reading: Reading | null, source: Source, shelley: number, corrections: Record<FieldKey, string>) {
  const queue = useRef<ReturnType<typeof createQueue> | null>(null)
  const run = useRef({ id: '', seq: 0 })
  const held = useRef<{ reading: Reading; source: Source; corrected: FieldKey[] } | null>(null)

  if (!queue.current && sendingAllowed()) queue.current = createQueue({ send: post })

  const release = () => {
    const h = held.current
    held.current = null
    if (!h || !queue.current || !loadShare() || !shareable(h.reading, h.source, h.corrected) || h.source === 'manual') return
    const trigger = h.reading.frame?.trigger ?? 'screenshot'
    if (!run.current.id || startsRun(h.reading, trigger)) run.current = { id: crypto.randomUUID(), seq: 0 }
    queue.current.add(toSnapshot(h.reading, { run: run.current.id, seq: run.current.seq++, app: BUILD, source: h.source, trigger, shelley, corrected: h.corrected }))
  }

  useEffect(() => {
    if (!reading) return
    release()
    held.current = { reading, source, corrected: [] }
  }, [reading])

  useEffect(() => {
    if (held.current) held.current.corrected = Object.keys(corrections)
  }, [corrections])

  useEffect(() => {
    const onHide = () => {
      release()
      void queue.current?.flush()
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])
}
