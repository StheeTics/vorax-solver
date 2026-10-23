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
/** Workers reading frames: the first reads the board, and all of them match a hand's cards by their pictures, a
 *  card each, at once (one after another, the third card's picture came ~0.5 s after the board, Oct 23). */
const WORKERS = 3

export function useScan(textReader: () => Promise<ReadText | null> = browserTextReader): Scanner {
  const workers = useRef<Worker[]>([])
  const waiting = useRef(new Map<number, (r: never) => void>())
  const next = useRef(0)

  useEffect(() => {
    // loaded ahead, so it's ready for the first frame
    void textReader()
    if (typeof Worker === 'undefined') return
    const ws = Array.from({ length: WORKERS }, () => {
      const w = new Worker(new URL('./scanWorker.ts', import.meta.url), { type: 'module' })
      w.onmessage = (e: MessageEvent<{ id: number; reading?: Reading; read?: Record<number, PictureRead> }>) => {
        waiting.current.get(e.data.id)?.((e.data.reading ?? e.data.read) as never)
        waiting.current.delete(e.data.id)
      }
      return w
    })
    workers.current = ws
    return () => ws.forEach(w => w.terminate())
  }, [textReader])

  /** to: which worker (the board's own by default) */
  const ask = useCallback(<T,>(message: Record<string, unknown>, to = 0) => {
    const id = ++next.current
    return new Promise<T>(resolve => {
      waiting.current.set(id, resolve as (r: never) => void)
      workers.current[to % workers.current.length].postMessage({ id, ...message })
    })
  }, [])

  const pixels = useCallback(
    async (img: ImageData, trigger: string | undefined, local: LocalRefs, pictures: boolean): Promise<Reading> => {
      if (workers.current.length) return ask<Reading>({ img, trigger, local, pictures })
      const reading = scan(img, await loadData(), local, { pictures })
      if (reading.frame) reading.frame.trigger = trigger
      return reading
    },
    [ask],
  )

  const slots = useCallback(
    (img: ImageData, local: LocalRefs, ui?: number): Pictures =>
      async (phase: HandPhase, size: number, which: number[], among?: Record<number, string[]>) => {
        // one card's picture to its own worker, so a hand's cards are matched side by side
        if (workers.current.length) return ask<Record<number, PictureRead>>({ kind: 'slots', img, phase, size, slots: which, local, ui, among }, which.length === 1 ? which[0] : 0)
        const { fields, problems, ranks } = readSlots(img, layout(img, ui), size, phase, which, await loadData(), local, among)
        return Object.fromEntries(which.map(j => [j, { ranks: ranks[j], field: fields[`hand${j}`], unknown: problems.some(p => p.kind === 'unknownArt' && p.field === `hand${j}`) }]))
      },
    [ask],
  )

  return useCallback<Scanner>(
    async (img, trigger, local = {}) => {
      const readText = await textReader()
      if (!readText) return pixels(img, trigger, local, true)
      const t0 = Date.now()
      const board = await pixels(img, trigger, local, false)
      const t1 = Date.now()
      const reading = await readTitles(img, board, readText, slots(img, local, board.ui))
      const names = Date.now() - t1
      console.info(`[timing] board pixels ${t1 - t0} ms, card names ${names} ms (${img.width}x${img.height})${reading.timing?.steps?.length ? `, name steps ${reading.timing.steps.join(',')} (${reading.state.hand.join(', ')})` : ''}`)
      return { ...reading, timing: { ...reading.timing, pixels: t1 - t0, names } }
    },
    [pixels, slots, textReader],
  )
}
