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
  updated: '2026-10-18',
  supremeChance: 0.01,
  potionOffer: {
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
    'Targeted Xeno-Hormone': 1,
    'Potion Kit (Large)': 1,
    'Potion Kit (Small)': 1,
    'Rare Potion Kit (Small)': 1
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
      'Chrysalis Specimen': 1,
      'Incubation Sac': 1,
      'Hyperplastic Frontal Lobe': 1,
      'Hypertrophic Pituitary': 1,
      'Adherent Metatarsals': 1,
      'Contracted Claws': 1,
      'Aberrant Sprout': 1,
      'Prismatic Liver': 1
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
      'Lady of the Plague Quarter': 1,
      'Aberrant Stinger': 1,
      'Tanned Leather Restraint': 1,
      'Eyelid Speculum': 1,
      'Beak of the Twice-Born': 1,
      'Nettle Toggle': 1,
      'Egg-Burdened Butterfly': 1
    }
  },
  spawnRarity: {
    normal: 30,
    magic: 40,
    rare: 20,
    boss: 10
  }
}
