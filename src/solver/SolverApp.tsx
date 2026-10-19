import { useEffect, useMemo, useRef, useState } from 'react'
import type { ScreenState } from '@/strategy/advisor'
import { Attribution } from '@/ui/Attribution'
import { Footnote } from '@/ui/Footnote'
import { DOWNLOAD_URL, HOME_URL, SOLVER_URL } from '@/ui/links'
import { loadShelleyLevel, saveShelleyLevel, shelleyChosen } from '@/ui/settingsStore'
import { ShelleyPicker } from '@/ui/ShelleyPicker'
import { AdvicePanel } from './advice/AdvicePanel'
import { useAdvice } from './advice/useAdvice'
import { desktopBridge, overlayAsk, useOverlay } from './desktop/bridge'
import { unreadTanks } from './advice/unread'
import { BoardPanel } from './board/BoardPanel'
import { FrameView } from './board/FrameView'
import { LiveSource } from './live/LiveSource'
import { ReportBox } from './report/ReportBox'
import { ShareSwitch } from './share/ShareSwitch'
import { useShare } from './share/useShare'
import { sharedAdvice } from './share/snapshot'
import { WhichPick } from './board/WhichPick'
import { loadLocalRefs } from './scan/localRefs'
import { newTracker, trackInstruments, type PickQuestion } from './track'
import type { LocalRefs } from './scan/scan'
import { useScan, type Scanner } from './scan/useScan'
import { boardFromLink, demoPick } from './boardLink'
import { emptyState, liveSupported, type FieldKey, type FieldRead, type Reading, type Source } from './types'
import styles from './SolverApp.module.css'

/** A field's value as the player set it, for the report's corrections. */
function valueOf(s: ScreenState, field: FieldKey): string {
  const m = /^tank(\d)\.(\w+)$/.exec(field)
  if (m) {
    const t = s.tanks[+m[1]]
    return !t ? 'empty' : m[2] === 'empty' ? 'filled' : String(t[m[2] as keyof typeof t])
  }
  const h = /^(hand|instrument)(\d)$/.exec(field)
  if (h) return (h[1] === 'hand' ? s.hand : s.instruments)[+h[2]] ?? 'none'
  if (field === 'refreshes') return String(s.phase === 'potion' ? s.potionRefreshes : s.instrumentRefreshes)
  return String(s[field as keyof ScreenState] ?? '')
}

type Keep = (value: unknown, what?: 'reading' | 'advice' | 'pick') => void

let askId = 0


export function SolverApp({ scanner }: { scanner?: Scanner } = {}) {
  // a board link (?board=… or ?demo) opens a demo on that board: it's changed by hand under Board state, and
  // never shared
  const [linked] = useState(() => (typeof location === 'undefined' ? null : boardFromLink(location.search)))
  const source: Source = linked ? 'demo' : 'live'
  const [state, setState] = useState<ScreenState>(() => linked ?? emptyState())
  const [fields, setFields] = useState<Record<FieldKey, FieldRead>>({})
  const [shelley, setShelley] = useState(loadShelleyLevel)
  // until the player picks their level, the default stands in for it and they're asked (a demo board brings its own)
  const [askShelley, setAskShelley] = useState(() => !linked && !shelleyChosen())
  const [frame, setFrame] = useState<ImageData | null>(null)
  const [reading, setReading] = useState<Reading | null>(null)
  const [reading$, setReadingBusy] = useState(false)
  const [corrections, setCorrections] = useState<Record<FieldKey, string>>({})
  const [local, setLocal] = useState<LocalRefs>({})
  useEffect(() => void loadLocalRefs().then(setLocal), [])
  const workerScan = useScan()
  const read = scanner ?? workerScan
  const canLive = liveSupported()
  const board = useMemo(() => ({ ...state, shelley }), [state, shelley])
  const { shown, updating } = useAdvice(board)
  // the advice for the board on screen now (capture mode saves it beside the frame)
  const advice = shown && shown.board === board ? shown.advice : null
  // shared with the board, so real games can check the predictions
  useShare(reading, source, shelley, corrections, useMemo(() => (advice ? sharedAdvice({ board, advice }) : undefined), [advice, board]))
  // capture mode: the final advice for a saved frame is saved beside it
  const keepAdvice = useRef<Keep | null>(null)
  // instruments are remembered through a game rather than re-read from their small icons each time
  const tracker = useRef(newTracker())
  // picks the tracker can't place wait here for the player's answers, oldest first; a new one never replaces one
  // ?demo=pick opens with the question asked about an instrument whose icon the Solver hasn't seen
  const [pickAsks, setPickAsks] = useState<{ id: number; question: PickQuestion; count: number; frame: ImageData; keep?: Keep }[]>(() => {
    const ask = linked && typeof location !== 'undefined' ? demoPick(location.search) : null
    return ask ? [{ id: ++askId, ...ask }] : []
  })
  // inside Vorax Overlay, the card over the game shows the same advice, and the question about an
  // instrument, since the app keeps this window hidden
  useOverlay(shown, updating, overlayAsk(pickAsks.length, fields, corrections, askShelley))
  useEffect(() => {
    if (!advice?.final || !keepAdvice.current) return
    keepAdvice.current({ ...advice, hand: state.hand, phase: state.phase }, 'advice')
    keepAdvice.current = null
  }, [advice, state])

  // A frame from Live or a screenshot becomes the board; fields the reader was unsure of are marked.
  const onFrame = async (img: ImageData, trigger?: string, refs?: LocalRefs, keep?: Keep) => {
    setReadingBusy(true)
    try {
      const readFrom = Date.now()
      const read$ = await read(img, trigger, refs ?? local)
      const ms = Date.now() - readFrom
      console.info(`[timing] read the screen in ${ms} ms`)
      const raw = read$.debug ? { ...read$, debug: { ...read$.debug, ms } } : read$
      // a card flying off as it's played or picked: the last board and its advice still stand
      if (raw.problems.some(p => p.kind === 'animating')) {
        keep?.(raw, 'reading')
        return
      }
      setFrame(img)
      let r = raw
      if (!raw.problems.some(p => p.kind === 'notFound')) {
        const t = trackInstruments(tracker.current, raw, trigger)
        tracker.current = t.tracker
        const ask = t.ask
        if (ask) setPickAsks(list => [...list.filter(a => a.question.slot !== ask.slot), { id: ++askId, question: ask, count: t.instruments.length, frame: img, keep }])
        const fields = Object.fromEntries(Object.entries(raw.fields).filter(([k]) => !k.startsWith('instrument')))
        r = { ...raw, state: { ...raw.state, instruments: t.instruments }, fields: { ...fields, ...t.fields } }
      }
      keep?.(r, 'reading')
      keepAdvice.current = keep ?? null
      setReading(r)
      setCorrections({})
      if (!r.problems.some(p => p.kind === 'notFound')) {
        setState(r.state)
        setFields(r.fields)
      }
    } finally {
      setReadingBusy(false)
    }
  }
  const recheck = () => frame && void onFrame(frame, reading?.frame?.trigger)
  // cards the reader couldn't name on this board: they're reported, so they can be added for everyone
  const unknownCards = reading?.state.phase === 'protocol' ? [] : (reading?.problems ?? []).flatMap(p => (p.kind === 'unknownArt' ? [Number(/\d+/.exec(p.field)?.[0] ?? 0) + 1] : []))

  const answerPick = async (id: number, name: string) => {
    const asked = pickAsks.find(a => a.id === id)
    if (!asked) return
    const { question, keep } = asked
    setPickAsks(list => list.filter(a => a.id !== id))
    const owned = [...tracker.current.owned]
    owned[question.slot] = name
    tracker.current = { ...tracker.current, owned }
    setState(s => ({ ...s, instruments: owned }))
    setFields(f => ({ ...f, [`instrument${question.slot}`]: { sure: true, guess: name } }))
    keep?.({ picked: name, slot: question.slot, offer: question.offer }, 'pick')
    if (!linked) setLocal(await loadLocalRefs())
  }

  const edit = (next: ScreenState, field: FieldKey) => {
    setState(next)
    if (reading) setCorrections(c => ({ ...c, [field]: valueOf(next, field) }))
    if (field.startsWith('instrument')) tracker.current = { ...tracker.current, owned: [...next.instruments] }
    setFields(f => {
      const rest = { ...f }
      delete rest[field]
      return rest
    })
  }
  const changeShelley = (l: number) => {
    setShelley(l)
    saveShelleyLevel(l)
    setAskShelley(false)
  }

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <a className={`ghost-button ${styles.home}`} href={HOME_URL}>‹ Home</a>
        <h1 className={styles.title}>Vorax Solver</h1>
        <details className={styles.about}>
          <summary>What can this see?</summary>
          <ul>
            <li>Reads only the log file you give it, from the moment you connect it.</li>
            <li>Sees only the one window you share, and only when the log shows a move or you press Snap now.</li>
            <li>Pictures stay in this browser and are gone when you close the tab.</li>
            <li>Never clicks or types for you.</li>
            <li>Shares the boards it reads (tanks, cards offered, instruments, round), with no picture, no account and nothing about you. Turn it off with the switch beside Board state.</li>
            <li>With each board, to find out why some setups misread: the picture’s size, your screen’s scaling, whether it’s HDR, your browser and its version, how the numbers read, and in the app whether the game is windowed. No picture, no name, nothing that lasts from one day to the next.</li>
            <li>When you say which instrument you picked, shares that name and the icon's small grey pattern, never a screenshot.</li>
          </ul>
          <Attribution />
        </details>
      </header>
      {askShelley && (
        <section className={styles.shelleyAsk} aria-label="Your Intern Shelley level">
          <p>
            <strong>Which Intern Shelley level do you have?</strong> It sets how many times you can refresh the instruments, so the advice depends on it.
            You can change it any time under Board state.
          </p>
          <ShelleyPicker level={shelley} onChange={changeShelley} />
        </section>
      )}
      <aside className={styles.wip} role="note" aria-label="Work in progress">
        <strong>Work in progress:</strong> the odds are still being tuned from live games, and some instruments aren’t known yet.
        Playing with sharing on helps improve it.
      </aside>

      {linked ? (
        <p className={styles.demo} role="note" aria-label="Demo board">
          <strong>Demo board:</strong> change anything under Board state and the advice follows. <a href={SOLVER_URL}>Follow your own game</a>
        </p>
      ) : (
        <>
          {!desktopBridge() && (
            <div className={styles.sourceBar}>
              <a className={styles.appTab} href={DOWNLOAD_URL} title="Vorax Overlay: the Solver as a Windows app, with its advice over the game. Finds the game and its log by itself.">
                <span aria-hidden="true">⤓</span>Windows App (Best Experience)
              </a>
            </div>
          )}
          {canLive ? (
            <LiveSource onFrame={(img, trigger, keep) => void onFrame(img, trigger, undefined, keep)} />
          ) : (
            <p className={styles.note}>Live needs Chrome or Edge on a PC, or the Windows app.</p>
          )}
        </>
      )}
      {reading$ && <p className={styles.note}>Reading the picture…</p>}
      {reading?.problems.some(p => p.kind === 'notFound') && (
        <p className={styles.warn}>That doesn’t look like the Surgical Preparation screen.</p>
      )}
      {frame && (
        <div className={styles.frameRow}>
          <details className={styles.frame}>
            <summary>Show the screenshot</summary>
            <FrameView frame={frame} />
          </details>
          <button type="button" className="ghost-button" onClick={recheck}>Recheck</button>
        </div>
      )}

      <AdvicePanel advice={shown?.advice ?? null} updating={updating} state={shown?.board ?? state} iconsKnown={reading?.iconsKnown} unread={unreadTanks(fields, corrections)} />
      {pickAsks.map(a => (
        <WhichPick key={a.id} question={a.question} count={a.count} frame={a.frame} onPicked={name => void answerPick(a.id, name)} onSkip={() => setPickAsks(list => list.filter(x => x.id !== a.id))} learn={!linked} />
      ))}
      {unknownCards.length > 0 && (
        <p className={styles.unknownCard} role="status">
          {unknownCards.map(n => `Card ${n}`).join(' and ')} {unknownCards.length > 1 ? 'aren’t ones' : 'isn’t one'} the Solver knows yet.{' '}
          <a href="#report">Report it</a> so {unknownCards.length > 1 ? 'they' : 'it'} can be added.
        </p>
      )}

      <div className={styles.checkHead}>
        <h2 className={styles.checkTitle}>Board state</h2>
        <ShareSwitch />
      </div>
      <p className={styles.note}>If something here doesn’t match the game, correct it and the advice above follows.</p>
      <BoardPanel state={state} fields={fields} onChange={edit} shelley={shelley} onShelley={changeShelley} />
      <div id="report">
        <ReportBox reading={reading} corrections={corrections} source={source} frame={frame} />
      </div>

      <Footnote className={styles.footnote} />
    </main>
  )
}
