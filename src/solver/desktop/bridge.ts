// The Solver inside Vorax Overlay, the Windows app (desktop/): the app's preload puts `window.VoraxDesktop`
// on this page only. Through it the page reads the game's log from disk (no file to drag in), hears when the
// game starts and stops (its window is then shared by the app, with no picker), takes the app's picture
// hotkey, and sends the advice to the overlay card over the game. On the website there is no bridge.
import { useEffect } from 'react'
import type { FileLike } from '../live/logFollower'
import type { GameWindow } from '../share/snapshot'
import type { Depends } from '../advice/depends'
import type { FieldKey, FieldRead } from '../types'
import { unreadNote, unreadTanks } from '../advice/unread'
import { SCALING_FIX, TROUBLES, type Trouble } from '../live/troubles'
import type { Shown } from '../advice/useAdvice'
import { describe, predicted } from '../advice/describe'
import { PAUSES, type Pause } from '../advice/paused'
import { highlightBoxes, type Box } from '../advice/highlight'

export interface DesktopBridge {
  /** the log's size in bytes, or null while the app hasn't found it */
  logSize(): Promise<number | null>
  readLog(start: number, end: number): Promise<ArrayBuffer>
  /** called now with whether the game runs, then on every change */
  onGame(cb: (game: { running: boolean }) => void): void
  /** the app's "take a picture now" hotkey */
  onSnap(cb: () => void): void
  showAdvice(card: OverlayCard): void
  /** an instrument the player chose on the card, answering "Which instrument did you take?" (apps from 0.1.8 on) */
  onChoose?(cb: (name: string) => void): void
  /** the card's "Show advice anyway", while the Solver is paused (apps from 0.1.9 on) */
  onForce?(cb: () => void): void
  /** brings the app's hidden Solver window up, to ask the player something (apps from 0.1.5 on) */
  showSolver?(): void
  /** the game window's outer size, the picture's, and the display scaling (apps from 0.1.4 on) */
  gameWindow?(): Promise<GameWindow | null>
  /** green boxes over the game around the advised move, none to clear them (apps from 0.1.12 on) */
  showHighlights?(boxes: Box[]): void
  /** the game just wrote to its log, so it's read now rather than at the next poll; returns the way to stop
   *  (apps from 0.1.13 on; the poll goes on either way) */
  onLogChanged?(cb: () => void): () => void
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
  /** what the card should say (the Solver window's questions, what stops it following the game), most pressing
   *  first; Show me opens the window, which the app keeps hidden. Apps before 0.1.7 show only `ask`. */
  asks: string[]
  ask: string | null
  /** the open instrument question's offer: answered with a click on the card (apps from 0.1.8 on) */
  choices: string[]
  /** the Solver is paused (`move` says what to fix): the card offers "Show advice anyway" (apps from 0.1.9 on) */
  paused: boolean
  /** advice shown anyway though it can't be trusted: said in red over the move (apps from 0.1.9 on) */
  warning: string
}

/** What pauses the Solver, and what was overridden: `paused` first; `forced` makes the advice unreliable. */
export interface Gate {
  paused: Pause[]
  forced: Pause[]
}

/** Everything the card should say, most pressing first: what stops the Solver following or reading the game,
 *  the player's Intern Shelley level until it's picked (the advice depends on it), an instrument it couldn't
 *  tell (it waits for the answer), tanks whose numbers weren't read, an instrument read unsure. */
/** unknownCards: the offered cards (1-based) the Solver doesn't know, left out of its advice */
export function overlayAsks(pending: number, fields: Record<FieldKey, FieldRead>, corrections: Record<FieldKey, string>, shelleyUnset = false, troubles: Trouble[] = [], unknownCards: number[] = []): string[] {
  const out: string[] = []
  // the advice can't weigh a card it doesn't know: the player should, before following it
  if (unknownCards.length) out.push(`${unknownCards.map(n => `Card ${n}`).join(' and ')} ${unknownCards.length > 1 ? 'aren’t cards' : 'isn’t a card'} the Solver knows: the advice leaves ${unknownCards.length > 1 ? 'them' : 'it'} out. Weigh ${unknownCards.length > 1 ? 'them' : 'it'} yourself.`)
  // the log's one step fits on the card; the others' several are in the Solver window
  for (const t of troubles) out.push(`${TROUBLES[t].card} ${t === 'logOff' ? TROUBLES.logOff.steps[0] : 'Show me says what to check.'}`)
  if (shelleyUnset) out.push('Which Intern Shelley level do you have? Pick it in the Solver: it sets your instrument refreshes.')
  if (pending > 0) out.push('Which instrument did you take? The Solver couldn’t tell.')
  // a screen it can't read already says the numbers are off
  const tanks = unreadTanks(fields, corrections)
  if (tanks.length && !troubles.includes('cantRead')) out.push(`${unreadNote(tanks)} Check them in the Solver. If it keeps happening, ${SCALING_FIX}`)
  if (Object.entries(fields).some(([k, f]) => /^instrument\d$/.test(k) && !f.sure && !(k in corrections))) out.push('An instrument may be misread: check it in the Solver.')
  return out
}

/** The most pressing of them. */
export const overlayAsk = (...a: Parameters<typeof overlayAsks>): string | null => overlayAsks(...a)[0] ?? null

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

export function overlayCard(shown: Shown | null, updating: boolean, asks: string[] = [], depends: Depends[] | null = null, choices: string[] = [], gate: Gate = { paused: [], forced: [] }, finished = false): OverlayCard {
  const ask = asks.length ? `${asks[0]}${asks.length > 1 ? ` (and ${asks.length - 1} more in the Solver)` : ''}` : null
  const warning = gate.forced.length ? `Unreliable: ${gate.forced.map(p => PAUSES[p].action.toLowerCase()).join(', ')}.` : ''
  const card = { detail: '', others: [], round: shown?.board.round ?? null, updating, asks, ask, choices, paused: false, warning }
  if (finished) return { ...card, updating: false, warning: '', move: 'Enjoy your loot', detail: 'The run is over. The Solver picks up again when the next one starts.' }
  // paused: what to fix, in place of the move; Show me opens the Solver, which says how
  if (gate.paused.length) {
    const [first, ...rest] = gate.paused
    const fix = 'Fix it in the Solver.'
    return { ...card, asks: [fix], ask: fix, warning: '', paused: true, move: PAUSES[first].action, detail: PAUSES[first].why, others: rest.map(p => PAUSES[p].action) }
  }
  // an unconfirmed pick changes the best move: each instrument's, not one move on a guess
  if (shown && depends) return { ...card, move: 'Depends on which instrument you took', others: depends.map(d => `With ${d.name}: ${d.move}`) }
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
export function useOverlay(shown: Shown | null, updating: boolean, asks: string[] = [], bridge: DesktopBridge | null = desktopBridge(), depends: Depends[] | null = null, choices: string[] = [], gate?: Gate, finished = false): void {
  const key = asks.join('\n')
  const offer = choices.join('\n')
  const paused = gate?.paused.join(',') ?? ''
  const forced = gate?.forced.join(',') ?? ''
  useEffect(() => {
    const split = (k: string) => (k ? (k.split(',') as Pause[]) : [])
    bridge?.showAdvice(overlayCard(shown, updating, key ? key.split('\n') : [], depends, offer ? offer.split('\n') : [], { paused: split(paused), forced: split(forced) }, finished))
  }, [shown, updating, key, bridge, depends, offer, paused, forced, finished])
}

/** Keeps the green boxes over the game in step with the advice: drawn only while the advice is for the screen
 *  and shown as a move, cleared otherwise. frame and ui: the picture the board was read from. */
export function useHighlights(shown: Shown | null, updating: boolean, frame: { width: number; height: number } | undefined, ui: number | undefined, held: boolean, bridge: DesktopBridge | null = desktopBridge()): void {
  const boxes = JSON.stringify(highlightBoxes(shown, frame, ui, { updating, held }))
  useEffect(() => {
    bridge?.showHighlights?.(JSON.parse(boxes) as Box[])
  }, [boxes, bridge])
}
