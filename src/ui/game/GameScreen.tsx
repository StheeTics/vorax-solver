import { useEffect, useReducer, useRef, useState } from 'react'
import type { Action, GameState, Tanks } from '@/engine/types'
import { dispatch, needsTargets } from '@/engine/game'
import { total } from '@/data/archetypes'
import { TankRow } from './TankRow'
import { StatusPanel } from './StatusPanel'
import { MonsterDetail } from './MonsterDetail'
import { CardHand } from './CardHand'
import { InstrumentStrip } from './InstrumentStrip'
import { LogDrawer } from './LogDrawer'
import type { Delta } from './FloatingDelta'
import styles from './GameScreen.module.css'

interface Props {
  initial: GameState
  sandbox: boolean
  onExit(): void
  onEnd(final: GameState): void
}

const reducer = (s: GameState, a: Action) => dispatch(s, a).state

let deltaId = 0
function diff(prev: Tanks, next: Tanks): Delta[] {
  const out: Delta[] = []
  next.forEach((t, i) => {
    const before = total(prev[i])
    const after = total(t)
    if (before !== after && t) out.push({ id: ++deltaId, tank: i, value: after - before })
  })
  return out
}

export function GameScreen({ initial, sandbox, onExit, onEnd }: Props) {
  const [state, send] = useReducer(reducer, initial)
  const [hovered, setHovered] = useState<number | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [deltas, setDeltas] = useState<Delta[]>([])
  const prevTanks = useRef(initial.tanks)

  useEffect(() => {
    const fresh = diff(prevTanks.current, state.tanks)
    prevTanks.current = state.tanks
    if (fresh.length === 0) return
    setDeltas(d => [...d, ...fresh])
    const ids = new Set(fresh.map(d => d.id))
    const timer = setTimeout(() => setDeltas(d => d.filter(x => !ids.has(x.id))), 1400)
    return () => clearTimeout(timer)
  }, [state.tanks])

  useEffect(() => {
    if (state.phase !== 'gameOver') return
    const timer = setTimeout(() => onEnd(state), 900)
    return () => clearTimeout(timer)
  }, [state, onEnd])

  const leave = () => {
    if (state.phase === 'gameOver' || window.confirm('Leave this surgery and return to the menu?')) onExit()
  }

  return (
    <div className={styles.screen}>
      <header className={styles.top}>
        <button className={styles.back} onClick={leave} aria-label="Back to menu">‹</button>
        <h1 className={styles.title}>Surgical Preparation</h1>
        {sandbox && <span className={styles.badge}>Sandbox</span>}
        <button className={`ghost-button ${styles.logButton}`} onClick={() => setLogOpen(o => !o)}>Log</button>
      </header>

      <TankRow
        tanks={state.tanks}
        selectable={!!needsTargets(state)}
        targets={state.targets}
        deltas={deltas}
        onTankClick={i => send({ type: 'toggleTarget', tank: i })}
        onHover={setHovered}
      />
      <StatusPanel state={state} />
      <MonsterDetail monster={hovered === null ? null : state.tanks[hovered]} />
      {state.phase !== 'gameOver' && (
        <CardHand
          state={state}
          onSelect={i => send({ type: 'selectCard', index: i })}
          onConfirm={() => send({ type: 'confirm' })}
          onRefresh={() => send({ type: 'refresh' })}
        />
      )}
      {state.phase === 'gameOver' && <div className={styles.over}>Surgery complete</div>}
      <InstrumentStrip equipped={state.instruments} />
      <LogDrawer log={state.log} open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  )
}
