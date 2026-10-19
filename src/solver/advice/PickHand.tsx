// The pick drawn as the game shows it: the six tanks across, large and centred, with the ones to target lit,
// and the hand fanned beneath them with the card to take raised and marked. Matching it to the screen is
// faster than reading names and numbers.
import { POTIONS } from '@/data/potions'
import { INSTRUMENTS } from '@/data/instruments'
import type { Card } from '@/engine/types'
import type { Ranked, ScreenState } from '@/strategy/advisor'
import { CardArt } from '@/ui/svg/CardArt'
import { ArchetypeIcon } from '@/ui/svg/icons'
import { isXenopanacea } from '@/data/xenopanacea'
import styles from './PickHand.module.css'

const potion = new Map(POTIONS.map(p => [p.name, p]))
const instrument = new Map(INSTRUMENTS.map(i => [i.name, i]))

const ARCHETYPE_NAME = { pest: 'Pest', aemberon: 'Aemberon', boneSentry: 'Bone Sentry', agito: 'Agito' } as const

/** The drawing and frame colour for an offered card's name, as the game frames them. */
function look(name: string, phase: ScreenState['phase']): { card?: Card; frame: string } {
  if (phase === 'instrument') {
    const i = instrument.get(name)
    return { card: i && { kind: 'instrument', id: i.id }, frame: 'rare' }
  }
  const p = potion.get(name)
  return { card: p && { kind: 'potion', id: p.id }, frame: p?.rarity ?? (isXenopanacea(name) ? 'supreme' : 'normal') }
}

/** Degrees of tilt per step from the middle of the hand, as the game fans its cards. */
const FAN_TILT = 3

/** children: what to do, shown between the tanks and the cards (the eye goes from the board to the hand) */
export function PickHand({ pick, state, children }: { pick: Ranked | null; state: ScreenState; children?: React.ReactNode }) {
  const targets = pick?.targets ?? []
  return (
    <div className={styles.stage}>
      {state.phase === 'potion' && (
        <ol className={styles.tanks} aria-label="Tanks">
          {state.tanks.map((t, i) => {
            const target = targets.includes(i)
            return (
              <li
                key={i}
                className={`${styles.tank} ${t ? styles[t.rarity] : styles.empty} ${target ? styles.target : ''}`}
                aria-label={t ? `Tank ${i + 1}: ${ARCHETYPE_NAME[t.archetype]}, ${t.rarity}, ${t.activity} × ${t.quantity}${target ? ', target' : ''}` : `Tank ${i + 1}: empty`}
                aria-current={target ? 'true' : undefined}
              >
                {target && <span className={styles.here}>Target</span>}
                <span className={styles.glass}>
                  {t && (
                    <>
                      <ArchetypeIcon archetype={t.archetype} size={36} />
                      <span className={styles.aq}>{t.activity} × {t.quantity}</span>
                    </>
                  )}
                </span>
                <span className={styles.num}>{i + 1}</span>
              </li>
            )
          })}
        </ol>
      )}
      {children}
      <ol className={styles.hand} aria-label="Cards on offer">
        {state.hand.map((name, i) => {
          const { card, frame } = look(name, state.phase)
          const chosen = !!pick && i === pick.index
          return (
            <li
              key={i}
              className={`${styles.card} ${styles[frame]} ${chosen ? styles.chosen : ''} ${pick && !chosen ? styles.dim : ''}`}
              style={{ ['--tilt' as string]: `${(i - (state.hand.length - 1) / 2) * FAN_TILT}deg` }}
              aria-label={`Card ${i + 1}: ${name}${chosen ? ', pick this' : ''}`}
              aria-current={chosen ? 'true' : undefined}
            >
              {chosen && <span className={styles.badge}>Pick</span>}
              {card && <CardArt card={card} size={64} />}
              <span className={styles.name}>{name}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
