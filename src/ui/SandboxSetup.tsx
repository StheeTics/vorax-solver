import { useState } from 'react'
import { ARCHETYPES, ARCHETYPE_NAMES, BASE_STATS, RARITIES, RARITY_NAMES } from '@/data/archetypes'
import { INSTRUMENTS } from '@/data/instruments'
import { POTIONS } from '@/data/potions'
import { MAX_INSTRUMENTS } from '@/engine/game'
import type { Archetype, Rarity, SandboxSetup, Settings } from '@/engine/types'
import { RefreshFields } from './Settings'
import { loadSettings } from './settingsStore'
import { defaultRawSetup, validateSetup, type RawSetup, type RawTank } from './sandboxValidate'
import styles from './SandboxSetup.module.css'

interface Props {
  onStart(setup: SandboxSetup, settings: Settings): void
  onBack(): void
}

export function SandboxSetupScreen({ onStart, onBack }: Props) {
  const [raw, setRaw] = useState<RawSetup>(defaultRawSetup)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [error, setError] = useState<string | null>(null)

  const patch = (p: Partial<RawSetup>) => setRaw(r => ({ ...r, ...p }))
  const patchTank = (i: number, p: Partial<RawTank>) =>
    setRaw(r => ({ ...r, tanks: r.tanks.map((t, j) => (j === i ? { ...t, ...p } : t)) }))

  const toggleInstrument = (id: number) =>
    setRaw(r => {
      const has = r.instruments.some(x => x.id === id)
      if (has) return { ...r, instruments: r.instruments.filter(x => x.id !== id) }
      if (r.instruments.length >= MAX_INSTRUMENTS) return r
      return { ...r, instruments: [...r.instruments, { id, acquiredRound: Number(r.startRound) || 1 }] }
    })
  const setAcquired = (id: number, round: number) =>
    setRaw(r => ({ ...r, instruments: r.instruments.map(x => (x.id === id ? { ...x, acquiredRound: round } : x)) }))

  const setForced = (slot: number, id: number | null) =>
    setRaw(r => {
      const hand = [...r.forcedHand]
      if (id === null) hand.splice(slot, 1)
      else hand[slot] = id
      return { ...r, forcedHand: hand.filter(x => x !== undefined) }
    })

  const start = () => {
    const result = validateSetup(raw)
    if ('error' in result) return setError(result.error)
    setError(null)
    onStart(result.setup, settings)
  }

  return (
    <div className={styles.screen}>
      <header className={styles.head}>
        <button className={styles.back} onClick={onBack} aria-label="Back to menu">‹</button>
        <h1>Sandbox Setup</h1>
        <span className={styles.hint}>Build a starting position, then play a normal run from it.</span>
      </header>

      <section className={`panel-frame ${styles.col} ${styles.tanks}`}>
        <h2>Incubation Tanks</h2>
        <label className={styles.check}>
          <input type="checkbox" aria-label="Random starting monsters" checked={raw.randomTanks} onChange={e => patch({ randomTanks: e.target.checked })} />
          Random starting monsters (3–4)
        </label>
        <div className={styles.tankHead}>
          <span />
          <span>Archetype</span>
          <span>Rarity</span>
          <span>Activity</span>
          <span>Quantity</span>
        </div>
        {raw.tanks.map((t, i) => {
          const off = raw.randomTanks || t.empty
          return (
            <div key={i} className={styles.tankRow} data-off={off}>
              <label className={styles.check}>
                <input type="checkbox" aria-label={`Tank ${i + 1} occupied`} checked={!t.empty} disabled={raw.randomTanks} onChange={e => patchTank(i, { empty: !e.target.checked })} />
                Tank {i + 1}
              </label>
              <select aria-label={`Tank ${i + 1} archetype`} value={t.archetype} disabled={off} onChange={e => patchTank(i, { archetype: e.target.value as Archetype })}>
                {ARCHETYPES.map(a => <option key={a} value={a}>{ARCHETYPE_NAMES[a]}</option>)}
              </select>
              <select aria-label={`Tank ${i + 1} rarity`} value={t.rarity} disabled={off} onChange={e => patchTank(i, { rarity: e.target.value as Rarity, activity: '', quantity: '' })}>
                {RARITIES.map(r => <option key={r} value={r}>{RARITY_NAMES[r]}</option>)}
              </select>
              <input aria-label={`Tank ${i + 1} activity`} inputMode="numeric" placeholder={String(BASE_STATS[t.rarity].activity)} value={t.activity} disabled={off} onChange={e => patchTank(i, { activity: e.target.value })} />
              <input aria-label={`Tank ${i + 1} quantity`} inputMode="numeric" placeholder={String(BASE_STATS[t.rarity].quantity)} value={t.quantity} disabled={off} onChange={e => patchTank(i, { quantity: e.target.value })} />
            </div>
          )
        })}

        <h2 className={styles.gap}>First Hand <small>(optional)</small></h2>
        <div className={styles.forced}>
          {[0, 1, 2].map(slot => (
            <select key={slot} aria-label={`Forced card ${slot + 1}`} value={raw.forcedHand[slot] ?? ''} disabled={slot > raw.forcedHand.length}
              onChange={e => setForced(slot, e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">Random</option>
              {POTIONS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ))}
        </div>
      </section>

      <section className={`panel-frame ${styles.col} ${styles.instruments}`}>
        <h2>Surgical Instruments <small>{raw.instruments.length}/{MAX_INSTRUMENTS}</small></h2>
        <p className={styles.small}>None chosen → the run starts with the usual basic pick.</p>
        {(['basic', 'advanced'] as const).map(pool => (
          <div key={pool}>
            <div className={styles.poolTitle}>{pool === 'basic' ? 'Basic' : 'Advanced'}</div>
            <div className={styles.instrumentGrid}>
              {INSTRUMENTS.filter(d => d.pool === pool).map(d => {
                const eq = raw.instruments.find(x => x.id === d.id)
                const full = !eq && raw.instruments.length >= MAX_INSTRUMENTS
                return (
                  <div key={d.id} className={styles.instrument} data-on={!!eq} title={d.text.replace(/\{(\w+)\}/g, '$1')}>
                    <label className={styles.check}>
                      <input type="checkbox" checked={!!eq} disabled={full} onChange={() => toggleInstrument(d.id)} />
                      {d.name}
                    </label>
                    {eq && (
                      <label className={styles.acq}>
                        got in round
                        <input type="number" min={1} max={13} value={eq.acquiredRound} onChange={e => setAcquired(d.id, Number(e.target.value))} />
                      </label>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      <section className={`panel-frame ${styles.col} ${styles.run}`}>
        <h2>Run</h2>
        <label className={styles.field}>
          Starting round
          <input type="number" min={1} max={13} value={raw.startRound} onChange={e => patch({ startRound: e.target.value })} />
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={raw.thresholdsUsed.t8000} onChange={e => patch({ thresholdsUsed: { ...raw.thresholdsUsed, t8000: e.target.checked } })} />
          8,000 reward already taken
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={raw.thresholdsUsed.t28000} onChange={e => patch({ thresholdsUsed: { ...raw.thresholdsUsed, t28000: e.target.checked } })} />
          28,000 reward already taken
        </label>
        <label className={styles.field}>
          Seed
          <input aria-label="Seed" placeholder="random" value={raw.seed} onChange={e => patch({ seed: e.target.value })} />
        </label>
        <RefreshFields value={settings} onChange={setSettings} />
        {error && <div className={styles.error} role="alert">{error}</div>}
        <div className={styles.buttons}>
          <button className="gold-button" onClick={start}>Start</button>
          <button className="ghost-button" onClick={() => { setRaw(defaultRawSetup()); setSettings(loadSettings()); setError(null) }}>Reset to defaults</button>
        </div>
      </section>
    </div>
  )
}
