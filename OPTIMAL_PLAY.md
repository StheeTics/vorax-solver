# Optimal Play

How to build a run in Surgical Preparation that reaches 840,000 (the end-of-run battle bonus turns that into the rainbow reward): which instruments to take, which potions to play, and why.

**Contents:** [Quick answer](#quick-answer) · [Your first instrument](#your-first-instrument) · [Your next two instruments](#your-next-two-instruments) · [The strongest builds](#the-strongest-builds) · [Potions](#potions) · [How to play the rounds](#how-to-play-the-rounds) · [How these numbers were made](#how-these-numbers-were-made)

## Quick answer

- **First instrument:** Incubation Sac or Chrysalis Specimen, else Contracted Claws. Refresh the first offer if none of the three is there.
- **Next instruments:** Black Goat Gut Suture first, then Beak of the Twice-Born, Pig Iron Bone Saw, Canine Teeth File or Fouled Scraper. Skip Nettle Toggle, Sloughed Cortex and Two-Inch Skull Nail.
- **Potions:** play the ones that add and fuse monsters (Insect Attractant, Slough Solution, Xeno-Hormone), open Potion Kits instead of refreshing, and take a Xenopanacea most of the time.
- **Score is Activity × Quantity, added up over all six tanks.** Every pick is about growing both on the tanks that matter.

Played this way (the Solver's own advice), 79% of simulated runs reach 840,000.

## Your first instrument

The first instrument comes in round 1, from three basic instruments. How runs went with each:

| First instrument | Taken in | Reached 840k | Typical final score |
|---|---|---|---|
| **Incubation Sac** | 37% of runs | **82%** | 1.07M |
| **Chrysalis Specimen** | 21% | **82%** | 1.05M |
| **Contracted Claws** | 31% | 75% | 985k |
| Adherent Metatarsals | 5% | 80% | 1.03M |
| Hyperplastic Frontal Lobe | 4% | 76% | 985k |
| Aberrant Sprout | 2% | 64% | 943k |
| Hypertrophic Pituitary | 1% | 84% (25 runs) | 945k |
| Prismatic Liver | rarely | (5 runs) | |

- **Incubation Sac** (+45 Quantity to every monster each time one is added, once you have 2 Pest groups) pays off every time you add a monster, all game.
- **Chrysalis Specimen** (+8 Quantity to random groups, as many times as you have Pest groups, each round) grows with every Pest group you keep. It needs planning: build Pests early, even when another card gives more right now.
- **Contracted Claws** (+150 Quantity to a random monster each time a non-Bone Sentry is removed) is a removal engine: it doesn't need Bone Sentries.
- **None of the three on offer?** Refresh. The Solver refreshes the first offer in about a quarter of runs.

## Your next two instruments

The second and third instruments come as rewards for reaching 8,000 and 28,000, usually by rounds 2 to 5. They come from the advanced pool. How runs went with each in the final build:

| Advanced instrument | In builds | Reached 840k | Typical final score |
|---|---|---|---|
| **Black Goat Gut Suture** | 34% | 81% | 1.07M |
| **Pig Iron Bone Saw** | 29% | 82% | 1.01M |
| **Fouled Scraper** | 28% | 78% | 994k |
| **Canine Teeth File** | 21% | 83% | 1.04M |
| Tanned Leather Restraint | 19% | 78% | 1.01M |
| Rawhide Restraint | 15% | 79% | 978k |
| **Beak of the Twice-Born** | 14% | **86%** | 1.12M |
| Sinew Garrote | 9% | 77% | 1.01M |
| Lady of the Plague Quarter | 8% | 78% | 1.04M |
| Nettle Toggle | 6% | 64% | 903k |
| Sloughed Cortex | 5% | 60% | 908k |
| Vermicular Spinal Cord | 5% | 74% | 1.02M |
| Clustered Eggs | 4% | 73% | 1.04M |
| Egg-Burdened Butterfly, Eyelid Speculum, Two-Inch Skull Nail, Aberrant Stinger | rarely | | |

- **Black Goat Gut Suture** fuses any three monsters of the same rarity into one of the next rarity at the end of a round. With an engine that keeps adding monsters, it turns them into ever bigger ones. It's the most common partner of every strong basic.
- **Beak of the Twice-Born** adds a monster every round (and, with all six tanks full, has the biggest eat the smallest). Every add triggers Incubation Sac: together they reach 840k in 95% of runs.
- **Pig Iron Bone Saw, Fouled Scraper, Canine Teeth File** reward big monsters: they keep growing groups that are already large.
- **Skip** Nettle Toggle, Sloughed Cortex and Two-Inch Skull Nail when anything better is offered.
- **Pick from your board, not a plan.** The best instrument is the one that fits what's in your tanks now.

## The strongest builds

The builds the Solver ends up with most often, and how they did (builds with 20 runs or more):

| Build | Runs | Reached 840k | Typical final score |
|---|---|---|---|
| Black Goat Gut Suture + Canine Teeth File + Incubation Sac | 35 | **97%** | 1.22M |
| Beak of the Twice-Born + Fouled Scraper + Incubation Sac | 23 | **96%** | 1.23M |
| Chrysalis Specimen + Fouled Scraper + Pig Iron Bone Saw | 32 | **94%** | 1.09M |
| Beak of the Twice-Born + Black Goat Gut Suture + Incubation Sac | 28 | **93%** | 1.21M |
| Incubation Sac + Pig Iron Bone Saw + Tanned Leather Restraint | 23 | 91% | 975k |
| Canine Teeth File + Chrysalis Specimen + Pig Iron Bone Saw | 22 | 91% | 1.13M |
| Canine Teeth File + Contracted Claws + Pig Iron Bone Saw | 30 | 90% | 1.01M |
| Black Goat Gut Suture + Incubation Sac + Tanned Leather Restraint | 53 | 89% | 1.13M |
| Contracted Claws + Fouled Scraper + Rawhide Restraint | 26 | 88% | 980k |
| Black Goat Gut Suture + Incubation Sac + Pig Iron Bone Saw | 82 | 87% | 1.16M |
| Black Goat Gut Suture + Canine Teeth File + Contracted Claws | 31 | 87% | 1.18M |
| Chrysalis Specimen + Pig Iron Bone Saw + Tanned Leather Restraint | 37 | 86% | 1.10M |
| Black Goat Gut Suture + Contracted Claws + Pig Iron Bone Saw | 58 | 84% | 1.08M |
| Black Goat Gut Suture + Fouled Scraper + Incubation Sac | 75 | 83% | 1.20M |
| Black Goat Gut Suture + Contracted Claws + Fouled Scraper | 55 | 76% | 950k |
| Contracted Claws + Fouled Scraper + Sinew Garrote | 30 | 73% | 1.04M |
| Contracted Claws + Pig Iron Bone Saw + Sinew Garrote | 25 | 64% | 955k |
| Chrysalis Specimen + Fouled Scraper + Nettle Toggle | 26 | 65% | 939k |

No single build dominates: the most common is in only 4% of runs. The pattern is an engine (Incubation Sac, Chrysalis Specimen or Contracted Claws) plus one or two instruments that grow big monsters.

## Potions

How often the Solver plays each potion when it's offered (16% of hands it refreshes instead):

- **Almost always:** Insect Attractant (69%), Xenopanacea: Osteotrophy (65%), Slough Solution (57%), Potion Kit (Large) (56%), Bewitching Tincture (53%), the other Potion Kits (48–49%), Xeno-Hormone (48%).
- **Often:** Xenopanacea: Brood (44%), Viscous Bile Solution (43%), Twin Hormone - Pest (41%), Green Bile Solution (39%), Slender-Limb Powder - Pest (38%), Viviparous Hormone (36%).
- **Rarely:** Anesthetic Tincture - Aemberon (5%), Osteogenic Powder (9%), Plague Quarter Peat Poultice (10%), Gray Matter Spinal Solution (10%), Osteolytic Ointment (13%), Compound Revitalizing Pill (14%).

By engine:

- **Incubation Sac:** anything that adds monsters. Insect Attractant (76%), Slough Solution, Xeno-Hormone, Potion Kits.
- **Contracted Claws:** anything that removes monsters. Slough Solution, Xeno-Hormone (removes 1–2, then adds 4 to remove later), Potion Kits.
- **Chrysalis Specimen:** Pests and upgrades. Twin Hormone - Pest (65%), Bewitching Tincture, Viscous Bile Solution.

**Xenopanacea** cards change a random monster into an Aemberon and give it +333 Activity (Osteotrophy) or +333 Quantity (Brood). On your biggest monster that's huge; on a small one it's minor, and it can break a build that needs Pests or a rarity triple. Take one most of the time, not always.

## How to play the rounds

- **Add and fuse.** The strongest runs keep adding monsters (each add triggers Incubation Sac, each fusion feeds Black Goat Gut Suture) and turn them into a few very large groups.
- **Reach 8,000 and 28,000 early.** Those bring your second and third instruments; most runs have all three by round 5.
- **Keep a tank free with Incubation Sac.** An add with all six tanks full fails, and a failed add doesn't trigger the Sac.
- **Grow the groups that are already big.** Quantity and Activity on your largest group are worth far more than on a small one.
- **Refresh a potion hand only when nothing in it helps.** Open a Potion Kit instead of refreshing: it gives you a fresh choice and keeps your refresh.

## How these numbers were made

- **2,000 simulated runs,** played by the Solver's own advice: every option played out to the end of the run 500 times, at the live game's measured odds (October 25, 2026). The engine is this project's simulator; its rules and odds are checked against boards from real games.
- **Runs, not causes.** A build's numbers include the boards it was chosen on: the Solver takes Black Goat Gut Suture when the board suits it, so its runs started from boards that suited it. Read them as "how runs with this build went when the advice chose it".
- **Real games agree on the leaders:** in 3,841 games played with the Solver (October 19–23), Black Goat Gut Suture was the most common advanced instrument and the best-scoring of the common ones, and Incubation Sac and Contracted Claws the most common first picks.
- **The rules can differ from the game.** If a card works differently in the game than in the simulator, the numbers for it are off; please [report it](https://github.com/tidewarden/tli-vorax-simulator/issues/new/choose).
