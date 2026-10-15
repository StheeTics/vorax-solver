import { useState } from 'react'
import type { EquippedInstrument } from '@/engine/types'
import { instrument } from '@/data/instruments'
import { CardArt } from '../svg/CardArt'
import { Card } from './Card'
import styles from './InstrumentStrip.module.css'

export function InstrumentStrip({ equipped }: { equipped: EquippedInstrument[] }) {
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div className={styles.strip}>
      <div className={styles.title}>Surgical Instruments</div>
      {[0, 1, 2].map(slot => {
        const eq = equipped[slot]
        const def = eq && instrument(eq.id)
        return (
          <div
            key={slot}
            className={styles.slot}
            data-filled={!!def}
            onMouseEnter={() => def && setHover(slot)}
            onMouseLeave={() => setHover(null)}
          >
            {def ? (
              <>
                <CardArt card={{ kind: 'instrument', id: def.id }} size={34} />
                <span className={styles.name}>{def.name}</span>
              </>
            ) : (
              <span className={styles.emptySlot}>Empty slot</span>
            )}
            {hover === slot && def && (
              <div className={styles.popover}>
                <Card card={{ kind: 'instrument', id: def.id }} compact />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
