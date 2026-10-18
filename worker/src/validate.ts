// Rebuilds a snapshot from the fields the collector knows, so nothing else a client sends is stored.

export interface Names { potions: string[]; instruments: string[]; protocols: string[] }

const ARCHETYPES = ['pest', 'aemberon', 'boneSentry', 'agito']
const RARITIES = ['normal', 'magic', 'rare', 'boss']
const PHASES = ['potion', 'instrument', 'protocol']
const SOURCES = ['live', 'screenshot']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** The engine's cap on Activity and Quantity (src/ui/sandboxValidate.ts) */
const MAX_STAT = 1_000_000
const FIELD = /^(round|phase|refreshes|tank[0-5]\.(empty|archetype|rarity|activity|quantity)|hand[0-2]|instrument[0-2])$/

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
  if (!Array.isArray(s.hand) || s.hand.length > 3 || !s.hand.every(n => pool.includes(n as string))) return null
  if (!Array.isArray(s.instruments) || s.instruments.length > 3 || !s.instruments.every(n => names.instruments.includes(n as string))) return null
  if (!Array.isArray(s.corrected) || s.corrected.length > 40 || !s.corrected.every(k => str(k, FIELD))) return null
  return {
    uid: s.uid, run: s.run, seq: s.seq, app: s.app, source: s.source as string, trigger: s.trigger,
    round: s.round, phase: s.phase as string, refreshes: s.refreshes, shelley: s.shelley, corrected: s.corrected as string[],
    tanks, hand: s.hand as string[], instruments: s.instruments as string[],
  }
}
