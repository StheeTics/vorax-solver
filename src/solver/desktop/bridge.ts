// The Solver inside Vorax Overlay, the Windows app (desktop/): the app's preload puts `window.VoraxDesktop`
// on this page only. Through it the page reads the game's log from disk (no file to drag in), hears when the
// game starts and stops (its window is then shared by the app, with no picker), takes the app's picture
// hotkey, and sends the advice to the overlay card over the game. On the website there is no bridge.
import { useEffect } from 'react'
import type { FileLike } from '../live/logFollower'
import type { GameWindow } from '../share/snapshot'
import type { FieldKey, FieldRead } from '../types'
import { unreadNote, unreadTanks } from '../advice/unread'
import type { Shown } from '../advice/useAdvice'
import { describe, predicted } from '../advice/describe'

export interface DesktopBridge {
  /** the log's size in bytes, or null while the app hasn't found it */
  logSize(): Promise<number | null>
  readLog(start: number, end: number): Promise<ArrayBuffer>
  /** called now with whether the game runs, then on every change */
  onGame(cb: (game: { running: boolean }) => void): void
  /** the app's "take a picture now" hotkey */
  onSnap(cb: () => void): void
  showAdvice(card: OverlayCard): void
  /** the game window's outer size, the picture's, and the display scaling (apps from 0.1.4 on) */
  gameWindow?(): Promise<GameWindow | null>
}

/** What the overlay card shows: plain text only. */
export interface OverlayCard {
  move: string
  detail: string
  /** the next choices, each "move: prediction" */
  others: string[]
  round: number | null
  /** a newer board is being worked out: the card is the last board's */
  updating: boolean
  /** a question the Solver window is asking (which instrument was taken): the card shows it with a button
   *  that opens the window, which the app keeps hidden */
  ask: string | null
}

/** The question for the card: an instrument the Solver couldn't tell (it waits for the answer), tanks whose
 *  numbers weren't read (they change the advice most), or an instrument read unsure. */
export function overlayAsk(pending: number, fields: Record<FieldKey, FieldRead>, corrections: Record<FieldKey, string>): string | null {
  if (pending > 0) return 'Which instrument did you take? The Solver couldn’t tell.'
  const tanks = unreadTanks(fields, corrections)
  if (tanks.length) return `${unreadNote(tanks)} Check them in the Solver.`
  const unsure = Object.entries(fields).some(([k, f]) => /^instrument\d$/.test(k) && !f.sure && !(k in corrections))
  return unsure ? 'An instrument may be misread: check it in the Solver.' : null
}

export const desktopBridge = (): DesktopBridge | null => (typeof window !== 'undefined' && (window as unknown as { VoraxDesktop?: DesktopBridge }).VoraxDesktop) || null

/** The game's log as the log follower reads it, through the app. */
export function bridgeLog(bridge: DesktopBridge): FileLike {
  return {
    async getFile() {
      const size = await bridge.logSize()
      if (size === null) throw new Error('The game log hasn’t been found yet.')
      return { size, slice: (a: number, b?: number) => ({ arrayBuffer: () => bridge.readLog(a, b ?? size) }) }
    },
  }
}

const OTHERS = 2

export function overlayCard(shown: Shown | null, updating: boolean, ask: string | null = null): OverlayCard {
  const card = { detail: '', others: [], round: shown?.board.round ?? null, updating, ask }
  if (!shown) return { ...card, move: updating ? 'Working out the best move…' : 'Waiting for the cards…' }
  const { advice, board } = shown
  if (board.phase === 'protocol') return { ...card, move: 'Surgical Protocol', detail: 'Protocols don’t change Ultimate Activity: pick the one that suits your endgame battle.' }
  if (advice.best === 'refresh') return { ...card, move: 'Refresh', detail: advice.refreshEnd ? `Ends around ${predicted(advice.refreshEnd)}` : 'Nothing on offer is expected to beat the board as it is.' }
  if (!advice.best) return { ...card, move: 'Waiting for the cards…' }
  if (advice.note) return { ...card, move: describe(advice.best, board, true), detail: advice.note }
  const best = advice.best
  return {
    ...card,
    move: describe(best, board, true),
    detail: best.end ? `Ends around ${predicted(best.end)}` : '',
    others: advice.ranking.filter(r => r !== best).slice(0, OTHERS).map(r => `${describe(r, board)}: ${r.end ? predicted(r.end) : r.value.toLocaleString()}`),
  }
}

/** Keeps the overlay card in step with the advice on the page. */
export function useOverlay(shown: Shown | null, updating: boolean, ask: string | null = null, bridge: DesktopBridge | null = desktopBridge()): void {
  useEffect(() => {
    bridge?.showAdvice(overlayCard(shown, updating, ask))
  }, [shown, updating, ask, bridge])
}
