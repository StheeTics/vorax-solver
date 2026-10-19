// Rebuilds a snapshot from the fields the collector knows, so nothing else a client sends is stored.

export interface Names { potions: string[]; instruments: string[]; protocols: string[] }

const ARCHETYPES = ['pest', 'aemberon', 'boneSentry', 'agito']
const RARITIES = ['normal', 'magic', 'rare', 'boss']
const PHASES = ['potion', 'instrument', 'protocol']
const SOURCES = ['live', 'screenshot']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** The engine's cap on Activity and Quantity (src/ui/sandboxValidate.ts) */
const MAX_STAT = 1_000_000
const FIELD = /^(round|phase|refreshes|tank[0-5]\.(empty|archetype|rarity|activity|quantity)|hand[0-4]|instrument[0-3])$/

const int = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi
const str = (v: unknown, re: RegExp): v is string => typeof v === 'string' && re.test(v)

export function validate(raw: unknown, names: Names) {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  if (!str(s.uid, UUID) || !str(s.run, UUID) || !int(s.seq, 0, 100) || !str(s.app, /^[\w.-]{1,24}$/)) return null
  if (!SOURCES.includes(s.source as string) || !str(s.trigger, /^(board|screen|manual|screenshot)$/)) return null
  if (!int(s.round, 1, 13) || !PHASES.includes(s.phase as string) || !int(s.refreshes, 0, 9) || !int(s.shelley, 1, 6)) return null
  if (!Array.isArray(s.tanks) || s.tanks.length !== 6) return null
  const tanks = []
  for (const t of s.tanks) {
    if (t === null) {
      tanks.push(null)
      continue
    }
    const m = t as Record<string, unknown>
    if (!ARCHETYPES.includes(m.archetype as string) || !RARITIES.includes(m.rarity as string) || !int(m.activity, 1, MAX_STAT) || !int(m.quantity, 1, MAX_STAT)) return null
    tanks.push({ archetype: m.archetype as string, rarity: m.rarity as string, activity: m.activity, quantity: m.quantity })
  }
  const pool = s.phase === 'potion' ? names.potions : s.phase === 'instrument' ? names.instruments : names.protocols
  // a Potion Kit opens to five cards
  if (!Array.isArray(s.hand) || s.hand.length > (s.phase === 'potion' ? 5 : 3) || !s.hand.every(n => pool.includes(n as string))) return null
  if (!Array.isArray(s.instruments) || s.instruments.length > 3 || !s.instruments.every(n => names.instruments.includes(n as string))) return null
  if (!Array.isArray(s.corrected) || s.corrected.length > 40 || !s.corrected.every(k => str(k, FIELD))) return null
  // the fields the Solver wasn't sure of: boards from before it sent unsure ones had none
  if (s.unsure !== undefined && (!Array.isArray(s.unsure) || s.unsure.length > 40 || !s.unsure.every(k => str(k, FIELD)))) return null
  return {
    uid: s.uid, run: s.run, seq: s.seq, app: s.app, source: s.source as string, trigger: s.trigger,
    round: s.round, phase: s.phase as string, refreshes: s.refreshes, shelley: s.shelley, corrected: s.corrected as string[],
    tanks, hand: s.hand as string[], instruments: s.instruments as string[],
    ...(s.unsure !== undefined ? { unsure: s.unsure as string[] } : {}),
    ...adviceOf(s.advice),
  }
}

/** The advice shown with a board ({ move, activity, reached }); a malformed one is dropped, the board kept. */
function adviceOf(raw: unknown): { advice?: { move: string; activity: number | null; reached: number | null } } {
  if (!raw || typeof raw !== 'object') return {}
  const a = raw as Record<string, unknown>
  const okActivity = a.activity === null || int(a.activity, 0, 100 * MAX_STAT)
  const okReached = a.reached === null || (typeof a.reached === 'number' && a.reached >= 0 && a.reached <= 1)
  if (!str(a.move, /^[^<>]{1,160}$/) || !okActivity || !okReached) return {}
  return { advice: { move: a.move, activity: a.activity as number | null, reached: a.reached as number | null } }
}

/** Values in an instrument icon's pattern: 24x24 grey levels, centred and scaled to length 1. */
const ICON_SIZE = 576

/** A panel icon a player named ("Which instrument did you pick?"): the name and the icon's grey pattern,
 *  nothing else. */
export function validateIcon(raw: unknown, names: Names) {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  if (!str(s.uid, UUID) || typeof s.name !== 'string' || !names.instruments.includes(s.name)) return null
  const p = s.pattern
  if (!Array.isArray(p) || p.length !== ICON_SIZE || !p.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1)) return null
  const length = Math.hypot(...(p as number[]))
  if (length < 0.95 || length > 1.05) return null
  return { uid: s.uid, name: s.name, pattern: (p as number[]).map(v => Math.round(v * 1000) / 1000) }
}
