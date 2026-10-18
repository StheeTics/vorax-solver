import { useCallback, useEffect, useRef } from 'react'
import type { Reading } from '../types'
import { unpack, type HandPhase, type PackedScanData, type ScanData } from './data'
import { scan, type LocalRefs } from './scan'
import { readSlots } from './cards'
import { layout } from './layout'
import { readTitles, type PictureRead, type Pictures, type ReadText } from './titles'
import { browserTextReader } from './textReader'

export type Scanner = (img: ImageData, trigger?: string, local?: LocalRefs) => Promise<Reading>

// the reference data on the page itself, only where Workers aren't available
let pageData: Promise<ScanData> | null = null
const loadData = () => (pageData ??= import('./data.json').then(m => unpack(m.default as unknown as PackedScanData)))

/** Reads frames: the board's pixels in a Web Worker (on the page where Workers aren't available), the cards
 *  by their printed names, and by their pictures only where a name can't be read. Without the text reader
 *  (it couldn't load) every card is read by its picture. textReader: for tests. */
export function useScan(textReader: () => Promise<ReadText | null> = browserTextReader): Scanner {
  const worker = useRef<Worker | null>(null)
  const waiting = useRef(new Map<number, (r: never) => void>())
  const next = useRef(0)

  useEffect(() => {
    // loaded ahead, so it's ready for the first frame
    void textReader()
    if (typeof Worker === 'undefined') return
    const w = new Worker(new URL('./scanWorker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<{ id: number; reading?: Reading; read?: Record<number, PictureRead> }>) => {
      waiting.current.get(e.data.id)?.((e.data.reading ?? e.data.read) as never)
      waiting.current.delete(e.data.id)
    }
    worker.current = w
    return () => w.terminate()
  }, [textReader])

  const ask = useCallback(<T,>(message: Record<string, unknown>) => {
    const id = ++next.current
    return new Promise<T>(resolve => {
      waiting.current.set(id, resolve as (r: never) => void)
      worker.current!.postMessage({ id, ...message })
    })
  }, [])

  const pixels = useCallback(
    async (img: ImageData, trigger: string | undefined, local: LocalRefs, pictures: boolean): Promise<Reading> => {
      if (worker.current) return ask<Reading>({ img, trigger, local, pictures })
      const reading = scan(img, await loadData(), local, { pictures })
      if (reading.frame) reading.frame.trigger = trigger
      return reading
    },
    [ask],
  )

  const slots = useCallback(
    (img: ImageData, local: LocalRefs): Pictures =>
      async (phase: HandPhase, size: number, which: number[]) => {
        if (worker.current) return ask<Record<number, PictureRead>>({ kind: 'slots', img, phase, size, slots: which, local })
        const { fields, problems, ranks } = readSlots(img, layout(img), size, phase, which, await loadData(), local)
        return Object.fromEntries(which.map(j => [j, { ranks: ranks[j], field: fields[`hand${j}`], unknown: problems.some(p => p.kind === 'unknownArt' && p.field === `hand${j}`) }]))
      },
    [ask],
  )

  return useCallback<Scanner>(
    async (img, trigger, local = {}) => {
      const readText = await textReader()
      if (!readText) return pixels(img, trigger, local, true)
      return readTitles(img, await pixels(img, trigger, local, false), readText, slots(img, local))
    },
    [pixels, slots, textReader],
  )
}
