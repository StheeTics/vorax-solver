import { POTIONS } from './potions'

// Supreme (ULT) potions the simulator can't play out: a Xenopanacea it doesn't know (the cards print only flavour
// text; Osteotrophy and Brood, worked out from live boards, are simulated in src/data/potions/supreme.ts), and the
// Holy Water rites, whose effect is another card later (issue #13: First Rite Holy Water: Confession gives a Ritual
// Holy Water: Flagellation the next round). The Solver still reads them, and when one is offered it's always the
// advice. The family name alone, for a Xenopanacea not seen yet.
export const XENOPANACEA = ['Xenopanacea'] as const
export const HOLY_WATER_RITES = ['First Rite Holy Water: Confession', 'Ritual Holy Water: Flagellation'] as const
/** Every ULT name the Solver reads but doesn't simulate. */
export const ALWAYS_TAKE = [...XENOPANACEA, ...HOLY_WATER_RITES] as const

export const isXenopanacea = (name: string) => name.trim().toLowerCase().startsWith('xenopanacea')
const SIMULATED = new Set(POTIONS.map(p => p.name.toLowerCase()))
/** A Xenopanacea or a rite ("… Holy Water: …") the simulator doesn't play out; Purest Holy Water, The Holiest Water and
 *  the Xenopanaceas in POTIONS are simulated like any other potion. */
export const isAlwaysTake = (name: string) => !SIMULATED.has(name.trim().toLowerCase()) && (isXenopanacea(name) || /holy water:/i.test(name))
