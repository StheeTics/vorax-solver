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
  updated: '2026-10-21',
  supremeChance: 0.013,
  potionOffer: {
    'Probiotic Enzyme Solution': 1.3997486597499431,
    'Slough Solution': 0.878,
    'Leptomeningeal Solution': 0.878,
    'Osteolytic Ointment': 0.878,
    'Cleansing Ointment': 0.878,
    'Fresh Spinal Powder': 0.878,
    'Petrified Spinal Solution': 0.9227298472841119,
    'Viviparous Hormone': 1,
    'Eggshell Powder': 1,
    'Brain Fog Tincture': 1,
    'Osteogenic Powder': 2,
    'Gray Matter Spinal Solution': 1,
    'Hollow Spinal Solution': 1.7279325425949048,
    'Green Bile Solution': 1.5775778294509257,
    'Compound Leech Solution': 1,
    'Digestive Enzyme Solution': 1,
    'Vivigenic Powder': 1.6415359154651594,
    'Potent Xenopurge Powder': 1.4602390253660733,
    'Xenopurge Powder': 1,
    'Pure Leech Solution': 0.9270249224306107,
    'Bewitching Tincture': 1,
    'Mutagenic Powder': 1,
    'Viscous Bile Solution': 1,
    'Slender-Limb Powder - Pest': 1.538,
    'Twin Hormone - Pest': 1.538,
    'Spinal Solution - Agito': 1.538,
    'Anesthetic Tincture - Agito': 1.538,
    'Slender-Limb Powder - Bone Sentry': 2.19035853804911,
    'Twin Hormone - Bone Sentry': 1.538,
    'Anesthetic Tincture - Aemberon': 1.538,
    'Spinal Solution - Aemberon': 1.538,
    'Xeno-Hormone': 2.2003557896774977,
    'Targeted Xeno-Hormone': 1.2171980204102548,
    'Potion Kit (Large)': 0.4681530847731749,
    'Potion Kit (Small)': 0.439,
    'Rare Potion Kit (Small)': 0.8986086309945066
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
      'Chrysalis Specimen': 0.09463625480335085,
      'Incubation Sac': 0.07135444268772012,
      'Hyperplastic Frontal Lobe': 0.06122254297073267,
      'Hypertrophic Pituitary': 0.11533119890613373,
      'Adherent Metatarsals': 0.07178558735652808,
      'Contracted Claws': 0.10670830552997418,
      'Aberrant Sprout': 0.11339104789649783,
      'Prismatic Liver': 0.06467170032119647
    },
    advanced: {
      'Clustered Eggs': 1,
      'Sloughed Cortex': 1.131050605060506,
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
      'Egg-Burdened Butterfly': 0.125
    }
  },
  spawnRarity: {
    normal: 43.98493535769686,
    magic: 28.425974506855187,
    rare: 18.59911442235504,
    boss: 17.9549177416518
  }
}
