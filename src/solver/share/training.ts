// Training data: a screenshot of the game for a card the reader is short of (fewer than 3 reference pictures, so
// it's matched by picture poorly or not at all) or couldn't settle quickly (neither its picture nor its title on the
// first try). The collector asks first whether it still wants that card (one GitHub issue per card, "Training
// Data: <name>", up to 3 screenshots), so a card is sent a few times in all, not by every player. Only with sharing
// on, from the published site or Vorax Overlay, and once per card per install.
import type { HandPhase } from '../scan/data'
import rare from '../scan/rare.json'
import type { Reading } from '../types'
import { toPng } from '../live/windowCapture'
import { ENDPOINT, sendingAllowed } from './endpoint'
import { loadShare } from './shareStore'

export interface Wanted {
  phase: HandPhase
  /** the card's position in the hand, left to right */
  slot: number
  /** its name when the reader named it, else the title as read */
  name?: string
  text?: string
  /** short of pictures, or not settled quickly */
  why: 'rare' | 'slow'
}

/** The cards of a reading worth a screenshot: only cards the reader named. */
export function trainingWanted(r: Reading): Wanted[] {
  const phase = r.state.phase
  if (r.problems.some(p => p.kind === 'notFound' || p.kind === 'animating')) return []
  return (r.timing?.steps ?? []).flatMap((step, j): Wanted[] => {
    const field = `hand${j}`
    const missed = r.problems.find(p => p.kind === 'unknownArt' && p.field === field)
    // a card we have no name for isn't a card of the game: the reader was looking at something else
    if (missed) return []
    const name = r.fields[field]?.guess
    if (!name) return []
    if ((rare as Record<string, string[]>)[phase]?.includes(name)) return [{ phase, slot: j, name, why: 'rare' }]
    // 0: its picture settled it, 1: its title alone; anything later took the slower reads
    return step >= 2 ? [{ phase, slot: j, name, why: 'slow' }] : []
  })
}

/** The same card, however its title was read: its name, or the first letters of its text. */
export const trainingKey = (w: Pick<Wanted, 'phase' | 'name' | 'text'>) =>
  `${w.phase}:${w.name ?? `?${(w.text ?? '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 24)}`}`

const SENT = 'vorax-training-sent'
function sentKeys(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SENT) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}
function markSent(keys: Set<string>) {
  try {
    localStorage.setItem(SENT, JSON.stringify([...keys]))
  } catch {
    // not remembered: the collector still sends each card's issue only 3 screenshots
  }
}

async function base64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

interface Deps { on: boolean; allowed: boolean; endpoint: string; post: typeof fetch; build: string; jpeg: (img: ImageData) => Promise<string> }
const defaults = (): Deps => ({
  on: loadShare(),
  allowed: sendingAllowed(),
  endpoint: ENDPOINT,
  post: (...a) => fetch(...a),
  build: __BUILD__,
  jpeg: async img => base64(await toPng(img, 'image/jpeg', 0.85)),
})

/** Asks the collector about each wanted card, and sends the screenshot of those it still wants. */
export async function sendTraining(img: ImageData, r: Reading, wanted: Wanted[], deps: Deps = defaults()): Promise<void> {
  if (!deps.on || !deps.allowed || !wanted.length) return
  const sent = sentKeys()
  let picture: Promise<string> | null = null
  const hand = (r.timing?.steps ?? []).map((_, j) => r.fields[`hand${j}`]?.guess ?? '?')
  for (const w of wanted) {
    const key = trainingKey(w)
    if (sent.has(key)) continue
    sent.add(key)
    markSent(sent)
    const card = { phase: w.phase, ...(w.name ? { name: w.name } : { text: w.text }) }
    try {
      const ask = await deps.post(`${deps.endpoint}/v1/training/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(card) })
      if (!ask.ok || !((await ask.json()) as { want?: boolean }).want) continue
      picture ??= deps.jpeg(img)
      // the interface scale it was read at (the game logs it): the reader's examples are cut at it
      const body = JSON.stringify({ uid: crypto.randomUUID(), ...card, slot: w.slot, hand, why: w.why, round: r.state.round, ui: r.ui ?? 1, build: deps.build, picture: await picture })
      await deps.post(`${deps.endpoint}/v1/training`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    } catch {
      // not sent: another player's screenshot will do
    }
  }
}
