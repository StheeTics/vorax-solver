import { ARCHETYPES, ARCHETYPE_NAMES, BASE_STATS, RARITIES, RARITY_NAMES } from '@/data/archetypes'
import { MAX_STAT } from '@/ui/sandboxValidate'
import { ShelleyPicker } from '@/ui/ShelleyPicker'
import { names, type ScreenMonster, type ScreenState } from '@/strategy/advisor'
import type { Archetype, Rarity } from '@/engine/types'
import type { FieldKey, FieldRead } from '../types'
import styles from './BoardPanel.module.css'

interface Props {
  state: ScreenState
  fields: Record<FieldKey, FieldRead>
  onChange(state: ScreenState, field: FieldKey): void
  shelley: number
  onShelley(level: number): void
}

const NAMES = names()
const HAND_SLOTS = [0, 1, 2]

function Unsure({ read }: { read?: FieldRead }) {
  if (!read || read.sure) return null
  return <span className={styles.unsure} title={`Unsure: best guess ${read.guess ?? 'none'}`}>⚠</span>
}

const toCount = (v: string, max: number) => Math.min(max, Math.max(1, Math.round(Number(v)) || 1))

export function BoardPanel({ state, fields, onChange, shelley, onShelley }: Props) {
  const set = (patch: Partial<ScreenState>, field: FieldKey) => onChange({ ...state, ...patch }, field)
  const setTank = (i: number, m: ScreenMonster | null, field: string) =>
    set({ tanks: state.tanks.map((t, j) => (j === i ? m : t)) }, `tank${i}.${field}`)
  const setList = (key: 'hand' | 'instruments', i: number, name: string) => {
    const list = [...state[key]]
    if (name) list[i] = name
    else list.splice(i, 1)
    set({ [key]: list.filter(Boolean) }, `${key === 'hand' ? 'hand' : 'instrument'}${i}`)
  }
  const handNames = state.phase === 'potion' ? NAMES.potions : NAMES.instruments
  const refreshKey = state.phase === 'potion' ? 'potionRefreshes' : 'instrumentRefreshes'

  return (
    <section className={`panel-frame ${styles.board}`} aria-label="Board">
      <div className={styles.row}>
        <label className={styles.field}>
          Round <Unsure read={fields.round} />
          <input type="number" min={1} max={13} value={state.round ?? 1} onChange={e => set({ round: toCount(e.target.value, 13) }, 'round')} />
        </label>
        <label className={styles.field}>
          Choosing <Unsure read={fields.phase} />
          <select value={state.phase} onChange={e => set({ phase: e.target.value as ScreenState['phase'], hand: [] }, 'phase')}>
            <option value="potion">a potion</option>
            <option value="instrument">an instrument</option>
            <option value="protocol">a Surgical Protocol</option>
          </select>
        </label>
        <label className={styles.field}>
          Refreshes left <Unsure read={fields.refreshes} />
          <input type="number" min={0} max={9} value={state[refreshKey] ?? 0}
            onChange={e => set({ [refreshKey]: Math.min(9, Math.max(0, Math.round(Number(e.target.value)) || 0)) }, 'refreshes')} />
        </label>
        <ShelleyPicker level={shelley} onChange={onShelley} />
      </div>

      <h2>Tanks</h2>
      <div className={styles.tanks}>
        {state.tanks.map((t, i) => (
          <div key={i} className={styles.tank} data-empty={!t}>
            <label className={styles.check}>
              <input type="checkbox" aria-label={`Tank ${i + 1} occupied`} checked={!!t}
                onChange={e => setTank(i, e.target.checked ? { archetype: 'pest', rarity: 'normal', ...BASE_STATS.normal } : null, 'empty')} />
              Tank {i + 1} <Unsure read={fields[`tank${i}.empty`]} />
            </label>
            {t && (
              <>
                <label className={styles.field}>
                  <span>Archetype <Unsure read={fields[`tank${i}.archetype`]} /></span>
                  <select aria-label={`Tank ${i + 1} archetype`} value={t.archetype} onChange={e => setTank(i, { ...t, archetype: e.target.value as Archetype }, 'archetype')}>
                    {ARCHETYPES.map(a => <option key={a} value={a}>{ARCHETYPE_NAMES[a]}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Rarity <Unsure read={fields[`tank${i}.rarity`]} /></span>
                  <select aria-label={`Tank ${i + 1} rarity`} value={t.rarity} data-rarity={t.rarity} onChange={e => setTank(i, { ...t, rarity: e.target.value as Rarity }, 'rarity')}>
                    {RARITIES.map(r => <option key={r} value={r}>{RARITY_NAMES[r]}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Activity <Unsure read={fields[`tank${i}.activity`]} /></span>
                  <input aria-label={`Tank ${i + 1} activity`} type="number" min={1} max={MAX_STAT} value={t.activity}
                    onChange={e => setTank(i, { ...t, activity: toCount(e.target.value, MAX_STAT) }, 'activity')} />
                </label>
                <label className={styles.field}>
                  <span>Quantity <Unsure read={fields[`tank${i}.quantity`]} /></span>
                  <input aria-label={`Tank ${i + 1} quantity`} type="number" min={1} max={MAX_STAT} value={t.quantity}
                    onChange={e => setTank(i, { ...t, quantity: toCount(e.target.value, MAX_STAT) }, 'quantity')} />
                </label>
              </>
            )}
          </div>
        ))}
      </div>

      <h2>{state.phase === 'potion' ? 'Potions offered' : state.phase === 'instrument' ? 'Instruments offered' : 'Protocols offered'}</h2>
      {state.phase === 'protocol' ? (
        <p className={styles.field}>{state.hand.join(' · ') || 'None read'}</p>
      ) : <div className={styles.row}>
        {HAND_SLOTS.map(i => (
          <label key={i} className={styles.field}>
            <span>Card {i + 1} <Unsure read={fields[`hand${i}`]} /></span>
            <select aria-label={`Card ${i + 1}`} value={state.hand[i] ?? ''} disabled={i > state.hand.length} onChange={e => setList('hand', i, e.target.value)}>
              <option value="">None</option>
              {handNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        ))}
      </div>}

      <h2>Your instruments</h2>
      <div className={styles.row}>
        {HAND_SLOTS.map(i => (
          <label key={i} className={styles.field}>
            <span>Instrument {i + 1} <Unsure read={fields[`instrument${i}`]} /></span>
            <select aria-label={`Instrument ${i + 1}`} value={state.instruments[i] ?? ''} disabled={i > state.instruments.length} onChange={e => setList('instruments', i, e.target.value)}>
              <option value="">None</option>
              {NAMES.instruments.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        ))}
      </div>
    </section>
  )
}
