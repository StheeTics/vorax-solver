import { useEffect, useRef } from 'react'
import type { FieldKey, Reading, Source } from '../types'
import { appTag, ENDPOINT, sendingAllowed } from './endpoint'
import { createQueue } from './queue'
import { loadShare } from './shareStore'
import { isFinalBoard, shareable, startsRun, toSnapshot, unsureFields, type SharedAdvice, type Snapshot } from './snapshot'

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
 * player's corrections go with it, and what's still unsure is marked.
 */
/** advice: what the Solver advised for the board on screen, shared with it */
export function useShare(reading: Reading | null, source: Source, shelley: number, corrections: Record<FieldKey, string>, advice?: SharedAdvice) {
  const queue = useRef<ReturnType<typeof createQueue> | null>(null)
  const run = useRef({ id: '', seq: 0 })
  const held = useRef<{ reading: Reading; source: Source; corrected: FieldKey[]; advice?: SharedAdvice } | null>(null)

  if (!queue.current && sendingAllowed()) queue.current = createQueue({ send: post })

  const release = () => {
    const h = held.current
    held.current = null
    if (!h || !queue.current || !loadShare() || !shareable(h.reading, h.source)) return
    const trigger = h.reading.frame?.trigger ?? 'screenshot'
    if (!run.current.id || startsRun(h.reading, trigger)) run.current = { id: crypto.randomUUID(), seq: 0 }
    queue.current.add(toSnapshot(h.reading, { run: run.current.id, seq: run.current.seq++, app: appTag(BUILD), source: 'live', trigger, shelley, corrected: h.corrected, unsure: unsureFields(h.reading, h.corrected), advice: h.advice }))
  }

  useEffect(() => {
    if (!reading) return
    release()
    held.current = { reading, source, corrected: [] }
    // the game's last board: nothing follows to send it with, so it goes now (its final score)
    if (isFinalBoard(reading)) {
      release()
      void queue.current?.flush()
    }
  }, [reading])

  useEffect(() => {
    if (held.current) held.current.corrected = Object.keys(corrections)
  }, [corrections])

  useEffect(() => {
    if (held.current && advice) held.current.advice = advice
  }, [advice])

  useEffect(() => {
    const onHide = () => {
      release()
      void queue.current?.flush()
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])
}
