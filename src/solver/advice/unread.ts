// Tanks whose Activity x Quantity weren't read for sure: an unreadable line stands in as 1 x 1, so the advice
// on such a board may be off until the player checks the numbers.
import type { FieldKey, FieldRead } from '../types'

/** The tanks (counted from 1) with an unsure Activity or Quantity the player didn't correct. */
export function unreadTanks(fields: Record<FieldKey, FieldRead>, corrections: Record<FieldKey, string>): number[] {
  const tanks = new Set<number>()
  for (const [k, f] of Object.entries(fields)) {
    const m = /^tank(\d)\.(activity|quantity)$/.exec(k)
    if (m && !f.sure && !(k in corrections)) tanks.add(Number(m[1]) + 1)
  }
  return [...tanks].sort((a, b) => a - b)
}

/** "Tank 2's numbers …" / "Tanks 1, 2 and 4's numbers …" */
export function unreadNote(tanks: number[]): string {
  const list = tanks.length === 1 ? `Tank ${tanks[0]}` : `Tanks ${tanks.slice(0, -1).join(', ')} and ${tanks[tanks.length - 1]}`
  return `${list}’s numbers weren’t read for sure, so this advice may be off.`
}
