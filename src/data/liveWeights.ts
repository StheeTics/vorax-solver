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
  updated: '2026-10-22',
  supremeChance: 0.007355399531929121,
  potionOffer: {
    'Probiotic Enzyme Solution': 0.9631639666480608,
    'Slough Solution': 1.2077770375428065,
    'Leptomeningeal Solution': 0.878,
    'Osteolytic Ointment': 0.878,
    'Cleansing Ointment': 0.878,
    'Fresh Spinal Powder': 0.878,
    'Petrified Spinal Solution': 0.9227298472841119,
    'Viviparous Hormone': 1,
    'Eggshell Powder': 1,
    'Brain Fog Tincture': 1.23364685160186,
    'Osteogenic Powder': 1.2635789440579461,
    'Gray Matter Spinal Solution': 1.2078328141730366,
    'Hollow Spinal Solution': 1.3606602068520224,
    'Green Bile Solution': 1.2635789440579461,
    'Compound Leech Solution': 1,
    'Digestive Enzyme Solution': 1,
    'Vivigenic Powder': 1.2383536714046495,
    'Potent Xenopurge Powder': 1.0548938682335904,
    'Xenopurge Powder': 1.1144862567413816,
    'Pure Leech Solution': 1.1772004036809631,
    'Bewitching Tincture': 1.2759669729212593,
    'Mutagenic Powder': 1.174336906813309,
    'Viscous Bile Solution': 1.2689303052664929,
    'Slender-Limb Powder - Pest': 1.538,
    'Twin Hormone - Pest': 1.8386082884450798,
    'Spinal Solution - Agito': 2.0333461518125726,
    'Anesthetic Tincture - Agito': 1.8156538218377043,
    'Slender-Limb Powder - Bone Sentry': 1.9015624305185754,
    'Twin Hormone - Bone Sentry': 2.1481458356384016,
    'Anesthetic Tincture - Aemberon': 1.538,
    'Spinal Solution - Aemberon': 1.7467120697271608,
    'Xeno-Hormone': 1.8682814688474927,
    'Targeted Xeno-Hormone': 1.6817148624013758,
    'Potion Kit (Large)': 0.4681530847731749,
    'Potion Kit (Small)': 0.5574612988490939,
    'Rare Potion Kit (Small)': 0.6268209941677856
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
    'Slender-Limb Powder - Pest': 2,
    'Twin Hormone - Pest': 2,
    'Spinal Solution - Agito': 1,
    'Anesthetic Tincture - Agito': 2,
    'Slender-Limb Powder - Bone Sentry': 1,
    'Twin Hormone - Bone Sentry': 2,
    'Anesthetic Tincture - Aemberon': 1,
    'Spinal Solution - Aemberon': 1,
    'Xeno-Hormone': 1,
    'Targeted Xeno-Hormone': 1
  },
  instrumentOffer: {
    basic: {
      'Chrysalis Specimen': 0.03683620188696326,
      'Incubation Sac': 0.026429288180704374,
      'Hyperplastic Frontal Lobe': 0.024628678477861925,
      'Hypertrophic Pituitary': 0.045778212784129975,
      'Adherent Metatarsals': 0.02703966435115944,
      'Contracted Claws': 0.043397745719355216,
      'Aberrant Sprout': 0.04397760308128753,
      'Prismatic Liver': 0.024537122052293667
    },
    advanced: {
      'Clustered Eggs': 1.0923380349730878,
      'Sloughed Cortex': 1.131050605060506,
      'Sinew Garrote': 1,
      'Vermicular Spinal Cord': 1,
      'Rawhide Restraint': 1,
      'Black Goat Gut Suture': 1.0612962866043483,
      'Pig Iron Bone Saw': 1,
      'Two-Inch Skull Nail': 1.0844514203946165,
      'Fouled Scraper': 1,
      'Canine Teeth File': 1,
      'Lady of the Plague Quarter': 0.20495978890391905,
      'Aberrant Stinger': 0.25,
      'Tanned Leather Restraint': 1,
      'Eyelid Speculum': 0.21893671294907466,
      'Beak of the Twice-Born': 0.25,
      'Nettle Toggle': 1,
      'Egg-Burdened Butterfly': 0.125
    }
  },
  spawnRarity: {
    normal: 46.18111156888711,
    magic: 28.425974506855187,
    rare: 18.59911442235504,
    boss: 16.95629455830123
  }
}
