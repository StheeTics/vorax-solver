// Reads a frame of the Surgical Preparation screen into the advisor's ScreenState.
import type { ScreenState } from '@/strategy/advisor'
import { emptyState, type FieldRead, type Problem, type Reading } from '../types'
import type { ScanData } from './data'
import { layout } from './layout'
import { gray, type ArtFeature, type Img } from './pixels'
import { readText } from './digits'
import { readTank } from './tanks'
import { cardsPresent, fanSize, headerOnly, readHand } from './cards'
import { readInstruments } from './instruments'
import { normalColours, readAreas } from './levels'
import normal from './levels.json'

const DIGIT_MIN = 0.75

export type LocalRefs = Record<string, ArtFeature[]>

/** pictures: false leaves the cards to their printed names, read afterwards (titles.ts): their pictures are
 *  most of the work, and needed only for a name that can't be read. */
export function scan(captured: Img, data: ScanData, local: LocalRefs = {}, { pictures = true }: { pictures?: boolean } = {}): Reading {
  // read with the colours a normal capture has, whatever HDR or gamma this PC captures with
  const l = layout(captured)
  const colours = normalColours(captured, normal, readAreas(l))
  const img = colours.img
  const g = gray(img)
  const fields: Record<string, FieldRead> = {}
  const problems: Problem[] = []
  const frame = { width: img.width, height: img.height }

  const present = cardsPresent(img, l)
  if (present === 1 || present === 2) return { state: emptyState(), fields: {}, problems: [{ kind: 'animating' }], frame }

  // no cards dealt yet (or all gone): only the header to read
  const hand = present === 0 ? { ...headerOnly(img, l, data), ranks: [] } : pictures ? readHand(img, l, data, local) : headerOnly(img, l, data)
  const tanks = [0, 1, 2, 3, 4, 5].map(i => readTank(img, g, l, i, data))
  if (!hand.phase && tanks.every(t => !t.monster)) return { state: emptyState(), fields: {}, problems: [{ kind: 'notFound' }], frame: { width: img.width, height: img.height } }

  Object.assign(fields, hand.fields)
  problems.push(...hand.problems)
  for (const t of tanks) Object.assign(fields, t.fields)

  const state: ScreenState = { tanks: tanks.map(t => t.monster), hand: hand.names, instruments: [], phase: hand.phase ?? 'potion' }

  const round = readText(img, g, l.round, 'round', data.digits.round)
  const n = Number(round?.text)
  const roundOk = !!round && Number.isInteger(n) && n >= 1 && n <= 13 && round.score >= DIGIT_MIN
  state.round = roundOk ? n : 1
  fields.round = { sure: roundOk, guess: round?.text, score: round?.score, second: round?.second }
  if (!roundOk) problems.push({ kind: 'unreadable', field: 'round' })

  if (state.phase !== 'protocol') {
    const ref = readText(img, g, l.refresh, 'refresh', data.digits.refresh)
    const left = Number(ref?.text)
    const ok = !!ref && Number.isInteger(left) && left >= 0 && left <= 9 && ref.score >= DIGIT_MIN
    state[state.phase === 'potion' ? 'potionRefreshes' : 'instrumentRefreshes'] = ok ? left : 0
    fields.refreshes = { sure: ok, guess: ref?.text, score: ref?.score, second: ref?.second }
  }

  const inst = readInstruments(img, l, data, local)
  state.instruments = inst.names
  Object.assign(fields, inst.fields)
  const instrumentRanks = inst.ranks

  for (const [k, f] of Object.entries(fields)) if (!f.sure && /^tank\d\.(activity|quantity)$/.test(k) && !problems.some(p => p.kind === 'unreadable' && p.field === k)) problems.push({ kind: 'unreadable', field: k })
  return { state, fields, problems, frame, debug: { off: Math.round(colours.off * 1000) / 1000, corrected: colours.corrected, tanks: tanks.map(t => t.debug) }, instrumentRanks, iconsKnown: inst.known, handRanks: hand.ranks, ...(hand.ranks ? {} : { handPending: true as const, handSize: hand.phase === 'protocol' ? 3 : fanSize(img, l) }) }
}
