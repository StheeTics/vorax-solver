import type { Archetype } from '@/engine/types'

export type Vessel =
  | 'bottle' // corked bottle — Solutions
  | 'ampoule' // slim pointed vial — Hormones
  | 'twinAmpoule' // two vials — Twin Hormones
  | 'flask' // round-bottom flask — Tinctures
  | 'sack' // powder sack — Powders
  | 'jar' // ointment jar
  | 'cauldron' // iron pot
  | 'pillBottle'
  | 'heartFlask'
  | 'teardrop'
  | 'holedPot'
  | 'chest' // wooden potion box
  | 'case' // medical kit

export type Mark =
  | 'none' | 'swirl' | 'bubbles' | 'crystal' | 'drip' | 'leech' | 'spores' | 'flake'
  | 'eye' | 'target' | 'helix' | 'bone' | 'sprout' | 'shells' | 'smoke' | 'rope' | 'cross' | 'capsule' | 'glow' | 'fly'

export interface PotionArt {
  vessel: Vessel
  /** liquid / powder / body colour */
  color: string
  mark: Mark
  /** small archetype badge, for "- Pest" style variants */
  emblem?: Archetype
}

/** One distinct drawing per potion, loosely based on the in-game icons. */
export const POTION_ART: Record<number, PotionArt> = {
  // Solutions — corked bottles
  0: { vessel: 'bottle', color: '#b9c76a', mark: 'spores' }, // Probiotic Enzyme Solution
  1: { vessel: 'bottle', color: '#c9a27a', mark: 'flake' }, // Slough Solution
  2: { vessel: 'bottle', color: '#dba3b5', mark: 'swirl' }, // Leptomeningeal Solution
  6: { vessel: 'bottle', color: '#b8c6cf', mark: 'crystal' }, // Petrified Spinal Solution
  11: { vessel: 'bottle', color: '#9ba4ac', mark: 'swirl' }, // Gray Matter Spinal Solution
  12: { vessel: 'bottle', color: '#efe7d6', mark: 'none' }, // Hollow Spinal Solution
  13: { vessel: 'bottle', color: '#3fbf4a', mark: 'bubbles' }, // Green Bile Solution
  14: { vessel: 'bottle', color: '#8a2433', mark: 'leech' }, // Compound Leech Solution
  15: { vessel: 'bottle', color: '#d8c13f', mark: 'bubbles' }, // Digestive Enzyme Solution
  19: { vessel: 'bottle', color: '#cc3444', mark: 'leech' }, // Pure Leech Solution
  22: { vessel: 'bottle', color: '#e0902a', mark: 'drip' }, // Viscous Bile Solution
  25: { vessel: 'bottle', color: '#c6d2da', mark: 'none', emblem: 'agito' }, // Spinal Solution - Agito
  30: { vessel: 'bottle', color: '#c6d2da', mark: 'none', emblem: 'aemberon' }, // Spinal Solution - Aemberon
  // Hormones — slim ampoules
  7: { vessel: 'ampoule', color: '#e8a3c4', mark: 'none' }, // Viviparous Hormone
  24: { vessel: 'twinAmpoule', color: '#c9a3e8', mark: 'none', emblem: 'pest' }, // Twin Hormone - Pest
  28: { vessel: 'twinAmpoule', color: '#e8d6a3', mark: 'none', emblem: 'boneSentry' }, // Twin Hormone - Bone Sentry
  31: { vessel: 'ampoule', color: '#a8d046', mark: 'none' }, // Xeno-Hormone
  32: { vessel: 'ampoule', color: '#e3e23a', mark: 'target' }, // Targeted Xeno-Hormone
  // Tinctures — round flasks
  9: { vessel: 'flask', color: '#c9cdd2', mark: 'swirl' }, // Brain Fog Tincture
  20: { vessel: 'flask', color: '#a24fd2', mark: 'eye' }, // Bewitching Tincture
  26: { vessel: 'flask', color: '#d8691e', mark: 'none', emblem: 'agito' }, // Anesthetic Tincture - Agito
  29: { vessel: 'flask', color: '#d8691e', mark: 'none', emblem: 'aemberon' }, // Anesthetic Tincture - Aemberon
  // Powders — sacks
  5: { vessel: 'sack', color: '#e48d8d', mark: 'none' }, // Fresh Spinal Powder
  8: { vessel: 'sack', color: '#f2eee6', mark: 'shells' }, // Eggshell Powder
  10: { vessel: 'sack', color: '#efe7d6', mark: 'bone' }, // Osteogenic Powder
  16: { vessel: 'sack', color: '#d8443c', mark: 'none' }, // Vivigenic Powder
  17: { vessel: 'sack', color: '#9a4fd0', mark: 'rope' }, // Potent Xenopurge Powder
  18: { vessel: 'sack', color: '#c99cf0', mark: 'none' }, // Xenopurge Powder
  21: { vessel: 'sack', color: '#4fd0c2', mark: 'helix' }, // Mutagenic Powder
  23: { vessel: 'sack', color: '#a9a49c', mark: 'smoke', emblem: 'pest' }, // Slender-Limb Powder - Pest
  27: { vessel: 'sack', color: '#a9a49c', mark: 'smoke', emblem: 'boneSentry' }, // Slender-Limb Powder - Bone Sentry
  // Ointments
  3: { vessel: 'cauldron', color: '#5b5f63', mark: 'bubbles' }, // Osteolytic Ointment
  4: { vessel: 'jar', color: '#6f9a7c', mark: 'cross' }, // Cleansing Ointment
  37: { vessel: 'jar', color: '#6b4a2e', mark: 'spores' }, // Plague Quarter Peat Poultice
  // ULT potions
  35: { vessel: 'pillBottle', color: '#8a1726', mark: 'capsule' }, // Compound Revitalizing Pill
  36: { vessel: 'heartFlask', color: '#e0303f', mark: 'glow' }, // Fast-Acting Heart Tonic
  38: { vessel: 'holedPot', color: '#6f7a3e', mark: 'fly' }, // Insect Attractant
  39: { vessel: 'teardrop', color: '#f6e7a8', mark: 'glow' }, // Purest Holy Water
  41: { vessel: 'pillBottle', color: '#eceae4', mark: 'glow' }, // Rousing Salts
  42: { vessel: 'teardrop', color: '#ffd36b', mark: 'cross' }, // The Holiest Water
  43: { vessel: 'flask', color: '#b24bd1', mark: 'bone' }, // Xenopanacea: Osteotrophy
  44: { vessel: 'flask', color: '#d14b8f', mark: 'shells' }, // Xenopanacea: Brood
  // Boxes / kits
  33: { vessel: 'chest', color: '#9a6a3a', mark: 'none' }, // Potion Kit (Large)
  34: { vessel: 'case', color: '#7a1f24', mark: 'none' }, // Potion Kit (Small)
  40: { vessel: 'case', color: '#6b4a32', mark: 'cross' }, // Rare Potion Kit (Small)
}

/** One distinct drawing per Surgical Instrument. */
export const INSTRUMENT_ART: Record<number, string> = {
  1: 'cocoon', // Chrysalis Specimen
  2: 'eggSac', // Incubation Sac
  3: 'brain', // Hyperplastic Frontal Lobe
  4: 'gland', // Hypertrophic Pituitary
  5: 'bones', // Adherent Metatarsals
  6: 'claw', // Contracted Claws
  7: 'sprout', // Aberrant Sprout
  8: 'liver', // Prismatic Liver
  9: 'eggCluster', // Clustered Eggs
  10: 'cortex', // Sloughed Cortex
  11: 'garrote', // Sinew Garrote
  12: 'spine', // Vermicular Spinal Cord
  13: 'strap', // Rawhide Restraint
  14: 'needle', // Black Goat Gut Suture
  15: 'saw', // Pig Iron Bone Saw
  16: 'nail', // Two-Inch Skull Nail
  17: 'scraper', // Fouled Scraper
  18: 'file', // Canine Teeth File
  19: 'madonna', // Lady of the Plague Quarter
  20: 'stinger', // Aberrant Stinger
  21: 'buckle', // Tanned Leather Restraint
  22: 'retractor', // Eyelid Speculum
  23: 'beak', // Beak of the Twice-Born
  24: 'toggle', // Nettle Toggle
  25: 'butterfly', // Egg-Burdened Butterfly
}
