import type { ScreenState } from '@/strategy/advisor'
import { POTION_REFRESHES } from '@/data/shelley'

/** where the board comes from: the game, followed live; or a demo board opened by a link (never shared) */
export type Source = 'live' | 'demo'

/** 'round' | 'phase' | 'refreshes' | `tank${0-5}.${'empty'|'archetype'|'rarity'|'activity'|'quantity'}` | `hand${0-2}` | `instrument${0-2}` */
export type FieldKey = string

export interface FieldRead { sure: boolean; guess?: string; score?: number; second?: number }

export interface Rect { x: number; y: number; w: number; h: number }

export type Problem =
  | { kind: 'notFound' }
  /** a card is being played or picked: one card flies off on its own, so there is no hand to read */
  | { kind: 'animating' }
  | { kind: 'unreadable'; field: FieldKey }
  /** hand: 5 when the card was in a Potion Kit's five-card hand */
  | { kind: 'unknownArt'; field: FieldKey; crop: Rect; hand?: 5 }
  | { kind: 'unknownName'; name: string }

/** What the reader saw, shared with a board to find out why a setup misreads: numbers and short texts only. */
export interface ReadDebug {
  /** how far the frame's colours were from a normal capture's (levels.ts), and whether they were corrected */
  off: number
  corrected: boolean
  /** per tank: its name's measured colour, and its number lines as read before any fixing ('' when nothing was found) */
  tanks: ({ rgb: [number, number, number]; total: string; aq: string } | null)[]
  /** how long the read took */
  ms?: number
}

export interface Reading {
  state: ScreenState
  fields: Record<FieldKey, FieldRead>
  problems: Problem[]
  frame?: { width: number; height: number; trigger?: string }
  /** for each equipped-instrument icon (left to right), every known icon with its match score, best first */
  instrumentRanks?: [string, number][][]
  /** for each card position (left to right), the best few cards by picture, with their scores */
  handRanks?: [string, number][][]
  /** instruments whose panel icon the reader knows (built in, and learned in this browser) */
  iconsKnown?: string[]
  /** cards are showing but weren't read from their pictures: left to their printed names (see titles.ts) */
  handPending?: true
  /** with handPending: how many cards the hand holds (5 from a Potion Kit) */
  handSize?: 3 | 5
  debug?: ReadDebug
}

export const emptyState = (): ScreenState => ({ tanks: [null, null, null, null, null, null], hand: [], instruments: [], phase: 'potion', round: 1, potionRefreshes: POTION_REFRESHES })

/** Live needs the File System Access API and window capture: Chrome or Edge on a PC. */
export const liveSupported = (): boolean =>
  typeof window !== 'undefined' && 'showOpenFilePicker' in window && typeof navigator.mediaDevices?.getDisplayMedia === 'function'
