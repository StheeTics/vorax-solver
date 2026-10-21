/** Player-facing explanation of each highlighted card keyword (matches the engine's rules). */
export const MECHANICS: Record<string, { title: string; text: string }> = {
  add: {
    title: 'Add',
    text: 'Puts a new monster group into the leftmost empty Incubation Tank with its rarity’s base stats (Normal 1 × 36, Magic 5 × 24, Rare 15 × 12, Boss 300 × 1, as Activity × Quantity). If all 6 tanks are full, the group is lost and counts as exceeding the Max Incubation Tank Quantity.',
  },
  remove: {
    title: 'Remove',
    text: 'The group leaves its tank and all of its Activity and Quantity is lost. Fusing and devouring also remove groups, so they trigger “when removed” effects too.',
  },
  mutate: {
    title: 'Mutate',
    text: 'Changes the group’s Archetype. Its rarity is rerolled too, unless the card names a rarity. The group keeps its Activity and Quantity.',
  },
  awaken: {
    title: 'Awaken',
    text: 'Raises the group’s rarity one tier (or to the named rarity) and adds Activity: +60 into Magic, +120 into Rare or Boss. A Boss stays Boss and gains nothing. Awakening never lowers rarity.',
  },
  fuse: {
    title: 'Fuse',
    text: 'The groups are removed and merged into one group in the leftmost empty tank, with their Activity and Quantity summed.',
  },
  devour: {
    title: 'Devour',
    text: 'The devourer gains the prey’s Activity and Quantity, then the prey is removed.',
  },
}
