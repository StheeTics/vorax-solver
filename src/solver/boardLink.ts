// A link that opens the Solver on a given board, to show or share a hand without the game running:
// solver.html?board=<the board as base64url JSON>, or solver.html?demo for the example board.
// (scripts/scan/boardLink.ts makes one from a saved capture's .reading.json.)
import type { ScreenState } from '@/strategy/advisor'

/** A real board (captured game 1920-2): all six tanks full, and the best move a card for two tanks
 *  (Mutagenic Powder on tanks 3 and 4). */
export const DEMO_BOARD: ScreenState = {
  tanks: [
    { archetype: 'agito', rarity: 'normal', activity: 1, quantity: 36 },
    { archetype: 'agito', rarity: 'magic', activity: 5, quantity: 24 },
    { archetype: 'aemberon', rarity: 'rare', activity: 15, quantity: 12 },
    { archetype: 'aemberon', rarity: 'normal', activity: 1, quantity: 36 },
    { archetype: 'pest', rarity: 'normal', activity: 1, quantity: 36 },
    { archetype: 'pest', rarity: 'normal', activity: 1, quantity: 36 },
  ],
  hand: ['Osteogenic Powder', 'Mutagenic Powder', 'Petrified Spinal Solution'],
  instruments: ['Hyperplastic Frontal Lobe', 'Incubation Sac', 'Aberrant Sprout'],
  phase: 'potion',
  round: 1,
  potionRefreshes: 3,
}

const toBase64Url = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromBase64Url = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)))

export const boardLink = (board: ScreenState, page: string) => `${page}?board=${toBase64Url(JSON.stringify(board))}`

const isBoard = (b: unknown): b is ScreenState => {
  const x = b as ScreenState
  return !!x && Array.isArray(x.tanks) && x.tanks.length === 6 && Array.isArray(x.hand) && Array.isArray(x.instruments) && ['potion', 'instrument', 'protocol'].includes(x.phase)
}

/** The board a link opens: ?board=…, or ?demo; null when there's none, or it doesn't read as a board. */
export function boardFromLink(search: string): ScreenState | null {
  const q = new URLSearchParams(search)
  // ?demo=pick: just after taking a second instrument (the first of the demo's)
  if (q.get('demo') === 'pick') return { ...DEMO_BOARD, instruments: DEMO_BOARD.instruments.slice(0, 1) }
  if (q.has('demo')) return DEMO_BOARD
  const raw = q.get('board')
  if (!raw) return null
  try {
    const b = JSON.parse(fromBase64Url(raw))
    return isBoard(b) ? b : null
  } catch {
    return null
  }
}

/**
 * ?demo=pick: the demo board just after an instrument was picked whose icon the Solver hasn't seen, to show the
 * question it asks. The game screen it would cut the icon from is drawn: dark, with a stand-in icon in the
 * newest instrument slot.
 */
export function demoPick(search: string): { question: { offer: string[]; slot: number }; count: number; frame: ImageData } | null {
  if (new URLSearchParams(search).get('demo') !== 'pick') return null
  const width = 1920
  const height = 1080
  let frame = { width, height, data: new Uint8ClampedArray(width * height * 4).fill(12) } as unknown as ImageData
  const c = typeof document === 'undefined' ? null : document.createElement('canvas')
  const ctx = c?.getContext('2d')
  if (c && ctx) {
    c.width = width
    c.height = height
    ctx.fillStyle = '#120a0b'
    ctx.fillRect(0, 0, width, height)
    // the newest of two instruments sits second from the right of the panel (src/solver/scan/layout.ts)
    const k = height / 1440
    const cx = width - (162 + 135 * 0) * k
    const cy = 66 * k
    const r = 32 * k
    ctx.fillStyle = '#3a2a22'
    ctx.beginPath()
    ctx.roundRect(cx - r, cy - r, 2 * r, 2 * r, 8 * k)
    ctx.fill()
    ctx.fillStyle = '#d9c7a8'
    ctx.font = `bold ${Math.round(40 * k)}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('?', cx, cy + 2 * k)
    frame = ctx.getImageData(0, 0, width, height)
  }
  return { question: { offer: ['Two-Inch Skull Nail', 'Sinew Garrote', 'Nettle Toggle'], slot: 1 }, count: 2, frame }
}
