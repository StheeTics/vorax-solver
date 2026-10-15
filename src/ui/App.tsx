import { useCallback, useState } from 'react'
import type { GameState, SandboxSetup, Settings } from '@/engine/types'
import { createGame } from '@/engine/game'
import { Stage } from './Stage'
import { MainMenu } from './MainMenu'
import { GameScreen } from './game/GameScreen'
import { EndScreen } from './EndScreen'
import { loadSettings } from './settingsStore'
import { SandboxSetupScreen } from './SandboxSetup'
import { SANDBOX_ENABLED } from './features'

type Screen = 'menu' | 'sandbox' | 'game'

interface Run {
  /** Changes on every new run so GameScreen remounts with fresh state. */
  key: number
  initial: GameState
  setup: SandboxSetup | null
  settings: Settings
}

let runKey = 0

export function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [run, setRun] = useState<Run | null>(null)
  const [final, setFinal] = useState<GameState | null>(null)

  const start = (settings: Settings, setup: SandboxSetup | null) => {
    setFinal(null)
    setRun({ key: ++runKey, initial: createGame(settings, setup ?? undefined), setup, settings })
    setScreen('game')
  }
  const onEnd = useCallback((s: GameState) => setFinal(s), [])
  const toMenu = () => {
    setFinal(null)
    setRun(null)
    setScreen('menu')
  }

  return (
    <Stage>
      {screen === 'menu' && (
        <MainMenu
          onPlay={() => start(loadSettings(), null)}
          onSandbox={() => setScreen('sandbox')}
        />
      )}
      {SANDBOX_ENABLED && screen === 'sandbox' && <SandboxSetupScreen onStart={(setup, settings) => start(settings, setup)} onBack={() => setScreen('menu')} />}
      {screen === 'game' && run && (
        <GameScreen key={run.key} initial={run.initial} sandbox={!!run.setup} onExit={toMenu} onEnd={onEnd} />
      )}
      {screen === 'game' && run && final && (
        <EndScreen
          final={final}
          sandbox={!!run.setup}
          onRestart={() => start(run.settings, null)}
          onReplaySetup={() => start(run.settings, run.setup)}
          onMenu={toMenu}
        />
      )}
    </Stage>
  )
}
