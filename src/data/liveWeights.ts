// The engine's odds, measured from live games (scripts/live/weights.ts writes this file).
// Offer weights are relative: a card's chance is its weight over the pool's total.
import type { Rarity } from '@/engine/types'

export interface LiveWeights {
  updated: string
  supremeChance: number
  potionOffer: Record<string, number>
  boxOffer: Record<string, number>
  instrumentOffer: { basic: Record<string, number>; advanced: Record<string, number> }
  spawnRarity: Record<Rarity, number>
}

export const LIVE_WEIGHTS: LiveWeights = {
  updated: '2026-10-19',
  supremeChance: 0.013,
  potionOffer: {
    'Probiotic Enzyme Solution': 0.878,
    'Slough Solution': 0.878,
    'Leptomeningeal Solution': 0.878,
    'Osteolytic Ointment': 0.878,
    'Cleansing Ointment': 0.878,
    'Fresh Spinal Powder': 0.878,
    'Petrified Spinal Solution': 1.6953731847348865,
    'Viviparous Hormone': 1,
    'Eggshell Powder': 1,
    'Brain Fog Tincture': 1,
    'Osteogenic Powder': 2,
    'Gray Matter Spinal Solution': 1,
    'Hollow Spinal Solution': 1,
    'Green Bile Solution': 1,
    'Compound Leech Solution': 1,
    'Digestive Enzyme Solution': 1,
    'Vivigenic Powder': 1,
    'Potent Xenopurge Powder': 1,
    'Xenopurge Powder': 1,
    'Pure Leech Solution': 1,
    'Bewitching Tincture': 1,
    'Mutagenic Powder': 1,
    'Viscous Bile Solution': 1,
    'Slender-Limb Powder - Pest': 1.538,
    'Twin Hormone - Pest': 1.538,
    'Spinal Solution - Agito': 1.538,
    'Anesthetic Tincture - Agito': 1.538,
    'Slender-Limb Powder - Bone Sentry': 1.538,
    'Twin Hormone - Bone Sentry': 1.538,
    'Anesthetic Tincture - Aemberon': 1.538,
    'Spinal Solution - Aemberon': 1.538,
    'Xeno-Hormone': 1.538,
    'Targeted Xeno-Hormone': 1.538,
    'Potion Kit (Large)': 0.878,
    'Potion Kit (Small)': 0.878,
    'Rare Potion Kit (Small)': 1.6109949489091089
  },
  boxOffer: {
    'Probiotic Enzyme Solution': 1,
    'Slough Solution': 1,
    'Leptomeningeal Solution': 1,
    'Osteolytic Ointment': 1,
    'Cleansing Ointment': 1,
    'Fresh Spinal Powder': 1,
    'Petrified Spinal Solution': 1,
    'Viviparous Hormone': 1,
    'Eggshell Powder': 1,
    'Brain Fog Tincture': 1,
    'Osteogenic Powder': 1,
    'Gray Matter Spinal Solution': 1,
    'Hollow Spinal Solution': 1,
    'Green Bile Solution': 1,
    'Compound Leech Solution': 1,
    'Digestive Enzyme Solution': 1,
    'Vivigenic Powder': 1,
    'Potent Xenopurge Powder': 1,
    'Xenopurge Powder': 1,
    'Pure Leech Solution': 1,
    'Bewitching Tincture': 1,
    'Mutagenic Powder': 1,
    'Viscous Bile Solution': 1,
    'Slender-Limb Powder - Pest': 1,
    'Twin Hormone - Pest': 1,
    'Spinal Solution - Agito': 1,
    'Anesthetic Tincture - Agito': 1,
    'Slender-Limb Powder - Bone Sentry': 1,
    'Twin Hormone - Bone Sentry': 1,
    'Anesthetic Tincture - Aemberon': 1,
    'Spinal Solution - Aemberon': 1,
    'Xeno-Hormone': 1,
    'Targeted Xeno-Hormone': 1
  },
  instrumentOffer: {
    basic: {
      'Chrysalis Specimen': 0.33,
      'Incubation Sac': 0.33,
      'Hyperplastic Frontal Lobe': 0.33,
      'Hypertrophic Pituitary': 0.41978548075484845,
      'Adherent Metatarsals': 0.25,
      'Contracted Claws': 0.4722586658492045,
      'Aberrant Sprout': 0.37972027699968885,
      'Prismatic Liver': 0.300611885958087
    },
    advanced: {
      'Clustered Eggs': 1,
      'Sloughed Cortex': 1,
      'Sinew Garrote': 1,
      'Vermicular Spinal Cord': 1,
      'Rawhide Restraint': 1,
      'Black Goat Gut Suture': 1,
      'Pig Iron Bone Saw': 1,
      'Two-Inch Skull Nail': 1,
      'Fouled Scraper': 1,
      'Canine Teeth File': 1,
      'Lady of the Plague Quarter': 0.25,
      'Aberrant Stinger': 0.25,
      'Tanned Leather Restraint': 1,
      'Eyelid Speculum': 0.25,
      'Beak of the Twice-Born': 0.25,
      'Nettle Toggle': 1,
      'Egg-Burdened Butterfly': 0.25
    }
  },
  spawnRarity: {
    normal: 53.38983050847458,
    magic: 32.507605388961316,
    rare: 11.864406779661017,
    boss: 19.420127894704166
  }
}
