// The Xenopanacea family: Supreme (ULT) potions whose cards print only flavour text, so the simulator doesn't
// know their effects and leaves them out. When one is offered it should always be taken. The variants seen
// live, and the family name alone for one not seen yet.
export const XENOPANACEA = ['Xenopanacea: Osteotrophy', 'Xenopanacea: Brood', 'Xenopanacea'] as const

export const isXenopanacea = (name: string) => name.trim().toLowerCase().startsWith('xenopanacea')
