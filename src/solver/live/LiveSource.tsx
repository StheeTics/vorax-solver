import { useEffect, useRef, useState } from 'react'
import { createFollower, type FileLike } from './logFollower'
import { CHECK_MS, createLiveLoop, POLL_MS, type LiveEvent } from './liveLoop'
import { changeGate, isCaptureMode, nextIndex, saveFrame, saveReading, TICK_MS } from './captureMode'
import { waitStable } from './stable'
import { DEFAULT_RULES, type TriggerRules } from './triggers'
import { NotAWindowError, shareWindow, toPng, type WindowShare } from './windowCapture'
import styles from './LiveSource.module.css'

export interface Following { stop(): void; snapNow(): void; cancel(): void }

export interface LiveDeps {
  shareWindow(): Promise<WindowShare>
  follow(handle: FileLike, on: (e: LiveEvent) => void, rules: TriggerRules): Following
  pickLog(): Promise<FileLike>
}

/** Follows the log in a Worker, so a background tab keeps up; on the page where Workers aren't available. */
function follow(handle: FileLike, on: (e: LiveEvent) => void, rules: TriggerRules): Following {
  if (typeof Worker !== 'undefined') {
    const w = new Worker(new URL('./liveWorker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<LiveEvent>) => on(e.data)
    w.postMessage({ type: 'start', handle, rules })
    return { stop: () => w.terminate(), snapNow: () => w.postMessage({ type: 'snapNow' }), cancel: () => w.postMessage({ type: 'cancel' }) }
  }
  const loop = createLiveLoop({ follower: createFollower(handle), now: () => Date.now(), post: on, rules })
  const p = setInterval(() => void loop.poll(), POLL_MS)
  const c = setInterval(() => loop.check(), CHECK_MS)
  const k = setInterval(() => on({ type: 'tick' }), TICK_MS)
  return { stop: () => (clearInterval(p), clearInterval(c), clearInterval(k)), snapNow: loop.snapNow, cancel: loop.cancel }
}

async function pickLog(): Promise<FileLike> {
  const picker = (window as unknown as { showOpenFilePicker(o: object): Promise<FileSystemFileHandle[]> }).showOpenFilePicker
  const [handle] = await picker({ types: [{ description: 'Game log', accept: { 'text/plain': ['.log'] } }] })
  return handle
}

const DEFAULT_DEPS: LiveDeps = { shareWindow: () => shareWindow(), follow, pickLog }

const FOLDERS = [
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Torchlight Infinite\\UE_game\\TorchLight\\Saved\\Logs',
  'C:\\Program Files (x86)\\Torchlight Infinite\\Game\\UE_game\\Torchlight\\Saved\\Logs',
  'D:\\SteamLibrary\\steamapps\\common\\Torchlight Infinite\\UE_game\\TorchLight\\Saved\\Logs',
]

const RULES_KEY = 'vorax.liveRules'
function loadRules(): TriggerRules {
  try {
    const t = JSON.parse(localStorage.getItem(RULES_KEY) ?? 'null') as { settleMs?: number; maxMs?: number } | null
    return { ...DEFAULT_RULES, ...(t?.settleMs ? { settleMs: t.settleMs } : {}), ...(t?.maxMs ? { maxMs: t.maxMs } : {}) }
  } catch {
    return DEFAULT_RULES
  }
}
function saveRules(r: TriggerRules | null) {
  try {
    if (r) localStorage.setItem(RULES_KEY, JSON.stringify({ settleMs: r.settleMs, maxMs: r.maxMs }))
    else localStorage.removeItem(RULES_KEY)
  } catch {
    // not remembered
  }
}

const NO_LOG_MS = 30_000

interface Props {
  /** keep: in capture mode, saves what was read from this frame (or advised for it) beside it */
  onFrame(img: ImageData, trigger: string, keep?: (value: unknown, what?: 'reading' | 'advice' | 'pick') => void): void
  deps?: LiveDeps
}

export function LiveSource({ onFrame, deps = DEFAULT_DEPS }: Props) {
  const [log, setLog] = useState<FileLike | null>(null)
  const [share, setShare] = useState<WindowShare | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<Extract<LiveEvent, { type: 'status' }> | null>(null)
  const [frames, setFrames] = useState(0)
  const [noLog, setNoLog] = useState(false)
  const [rules, setRules] = useState(loadRules)
  const [dir, setDir] = useState<FileSystemDirectoryHandle | null>(null)
  const [saved, setSaved] = useState(0)
  const [tickError, setTickError] = useState('')
  const following = useRef<Following | null>(null)
  const gate = useRef(changeGate())
  const ticking = useRef(false)
  const shareRef = useRef<WindowShare | null>(null)
  const dirRef = useRef<FileSystemDirectoryHandle | null>(null)
  const savedRef = useRef(0)
  const capture = isCaptureMode()

  shareRef.current = share
  dirRef.current = dir

  const onEvent = useRef<(e: LiveEvent) => void>(() => {})
  onEvent.current = (e: LiveEvent) => {
    if (e.type === 'status') return setStatus(e)
    const s = shareRef.current
    if (!s) return
    if (e.type === 'tick') return void tick(s)
    const askedAt = Date.now()
    const take = e.kind === 'manual' ? s.grab() : waitStable(() => s.grab())
    void take.then(async img => {
      const snappedAt = Date.now()
      setFrames(n => n + 1)
      const d = dirRef.current
      const n = d ? ++savedRef.current : 0
      onFrame(img, e.kind, d ? (value, what) => void saveReading(d, n, e.kind, value, what) : undefined)
      if (d) {
        await saveFrame(d, n, e.kind, await toPng(img), { lines: e.lines, triggerAt: e.triggerAt, askedAt, snappedAt, width: img.width, height: img.height })
        setSaved(n)
      }
    }).catch(err => setError(String(err)))
  }

  // Capture mode: on every tick, a picture whenever the screen changed, so every game state is on record.
  async function tick(s: WindowShare) {
    const d = dirRef.current
    if (!capture || !d || ticking.current) return
    ticking.current = true
    try {
      const img = await s.grab()
      if (!gate.current(img)) return
      const n = ++savedRef.current
      const at = Date.now()
      await saveFrame(d, n, 'tick', await toPng(img, 'image/jpeg', 0.9), { lines: [], triggerAt: at, snappedAt: at, width: img.width, height: img.height }, 'jpg')
      setSaved(n)
      setTickError('')
    } catch (err) {
      setTickError(String(err))
    } finally {
      ticking.current = false
    }
  }

  useEffect(() => {
    if (!log) return
    following.current = deps.follow(log, e => onEvent.current(e), rules)
    return () => following.current?.stop()
  }, [log, deps, rules])

  useEffect(() => {
    if (!share || status?.detailSeen) return setNoLog(false)
    const t = setTimeout(() => setNoLog(true), NO_LOG_MS)
    return () => clearTimeout(t)
  }, [share, status?.detailSeen])

  const connect = async (get: () => Promise<FileLike>) => {
    setError('')
    try {
      setLog(await get())
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(String(err))
    }
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const item = e.dataTransfer.items[0] as DataTransferItem & { getAsFileSystemHandle?(): Promise<FileSystemHandle | null> }
    if (!item?.getAsFileSystemHandle) return setError('Your browser can’t follow a dropped file. Use Chrome or Edge.')
    void connect(async () => {
      const h = await item.getAsFileSystemHandle!()
      if (!h || h.kind !== 'file') throw new Error('Drop the UE_game.log file itself.')
      return h as FileSystemFileHandle
    })
  }
  const startShare = async () => {
    setError('')
    try {
      const s = await deps.shareWindow()
      s.onEnded(() => {
        following.current?.cancel()
        setShare(null)
      })
      setShare(s)
    } catch (err) {
      if (err instanceof NotAWindowError) setError(err.message)
      else if ((err as Error).name !== 'NotAllowedError') setError(String(err))
    }
  }
  const stopShare = () => {
    following.current?.cancel()
    share?.stop()
    setShare(null)
  }
  const pickFolder = async () => {
    try {
      const picker = (window as unknown as { showDirectoryPicker(o: object): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker
      const d = await picker({ mode: 'readwrite' })
      const names: string[] = []
      for await (const name of (d as unknown as { keys(): AsyncIterable<string> }).keys()) names.push(name)
      savedRef.current = nextIndex(names)
      setSaved(savedRef.current)
      setDir(d)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(String(err))
    }
  }
  const changeRules = (patch: Partial<TriggerRules>) => {
    const next = { ...rules, ...patch }
    setRules(next)
    saveRules(next)
  }

  const step = !log ? 1 : !share ? 2 : 3

  return (
    <section className={`panel-frame ${styles.live}`} aria-label="Live">
      <ol className={styles.steps}>
        <li data-state={step > 1 ? 'done' : 'now'}>① Connect the game log</li>
        <li data-state={step > 2 ? 'done' : step === 2 ? 'now' : 'later'}>② Share the game window</li>
        <li data-state={step === 3 ? 'now' : 'later'}>③ Watching</li>
      </ol>

      {step === 1 && (
        <div className={styles.body}>
          <div className={styles.drop} onDragOver={e => e.preventDefault()} onDrop={onDrop}>
            <strong>Drag UE_game.log here</strong>
            <span>from the game's log folder in File Explorer</span>
            <button type="button" className="ghost-button" onClick={() => void connect(deps.pickLog)}>Choose the file</button>
          </div>
          <div className={styles.help}>
            <p>First turn the game's log on: press Esc, open <b>Account Related</b>, click <b>Enable Log</b>, then log out and back in.</p>
            <p>The log folder is usually one of these:</p>
            <ul className={styles.paths}>
              {FOLDERS.map(f => (
                <li key={f}>
                  <code>{f}</code>
                  <button type="button" className="ghost-button" onClick={() => void navigator.clipboard?.writeText(f)}>Copy</button>
                </li>
              ))}
            </ul>
            <p className={styles.small}>Chrome can't open files under Program Files from its file window. Drag the file in instead.</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.body}>
          <button type="button" className="gold-button" onClick={() => void startShare()}>Share the game window</button>
          <p className={styles.small}>Pick the Torchlight: Infinite window. Only that window is seen, and only when the log shows a move.</p>
        </div>
      )}

      {step === 3 && (
        <div className={styles.body}>
          <div className={styles.row}>
            <button type="button" className="gold-button" onClick={() => following.current?.snapNow()}>Snap now</button>
            <button type="button" className="ghost-button" onClick={stopShare}>Stop sharing</button>
            <span className={styles.small}>
              {frames} picture{frames === 1 ? '' : 's'} · {status?.lines ?? 0} log lines read
              {status?.over ? ' · Game over. Waiting for the next one.' : ''}
            </span>
          </div>
          {noLog && <p className={styles.warn}>Enable Log looks off: no game lines have arrived. Press Esc, Account Related, Enable Log, then log out and back in.</p>}
        </div>
      )}

      {error && <p className={styles.warn}>{error}</p>}

      {capture && (
        <div className={styles.row}>
          <button type="button" className="ghost-button" onClick={() => void pickFolder()}>Save frames to a folder</button>
          <span className={styles.small}>{dir ? `Saving to ${dir.name}: ${saved} frames` : 'Capture mode: not saving yet'}</span>
          {tickError && <span className={styles.warn}>500 ms pictures: {tickError}</span>}
        </div>
      )}

      <details className={styles.small}>
        <summary>Triggers (testing)</summary>
        <label>Quiet before a picture (ms) <input type="number" min={100} max={5000} value={rules.settleMs} onChange={e => changeRules({ settleMs: Number(e.target.value) || DEFAULT_RULES.settleMs })} /></label>{' '}
        <label>Longest wait (ms) <input type="number" min={500} max={10000} value={rules.maxMs} onChange={e => changeRules({ maxMs: Number(e.target.value) || DEFAULT_RULES.maxMs })} /></label>{' '}
        <button type="button" className="ghost-button" onClick={() => (setRules(DEFAULT_RULES), saveRules(null))}>Reset</button>
      </details>
    </section>
  )
}
