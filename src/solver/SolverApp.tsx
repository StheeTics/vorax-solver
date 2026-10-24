import { useEffect, useMemo, useRef, useState } from 'react'
import type { ScreenState } from '@/strategy/advisor'
import { DOWNLOAD_URL, HOME_URL, SOLVER_URL, SUPPORT_URL } from '@/ui/links'
import { loadShelleyLevel, saveShelleyLevel, shelleyChosen } from '@/ui/settingsStore'
import { ShelleyPicker } from '@/ui/ShelleyPicker'
import { AdvicePanel } from './advice/AdvicePanel'
import { PausedPanel, UnreliableNote } from './advice/PausedPanel'
import { pausesOf, stillPaused, type Pause } from './advice/paused'
import { useAdvice } from './advice/useAdvice'
import { warmUp } from './advice/adviseOn'
import { desktopBridge, overlayAsks, useHighlights, useOverlay } from './desktop/bridge'
import { unreadTanks } from './advice/unread'
import { nextLook, unsureReading } from './live/retry'
import { dependsOn } from './advice/depends'
import { useAlternatives } from './advice/useAlternatives'
import { gameClosing, screenTrouble, type Trouble } from './live/troubles'
import { cropTo, windowedGame } from './live/windowCrop'
import { carriedRound } from './live/round'
import { BoardPanel } from './board/BoardPanel'
import { FrameView } from './board/FrameView'
import { LiveSource, type SnapTiming } from './live/LiveSource'
import { ReportBox } from './report/ReportBox'
import { ShareSwitch } from './share/ShareSwitch'
import { cardPicture, confirmUnknown, shareCard } from './share/card'
import { sendTraining, trainingWanted } from './share/training'
import { useShare } from './share/useShare'
import { sharedAdvice } from './share/snapshot'
import { WhichPick, teachPick } from './board/WhichPick'
import { loadLocalRefs } from './scan/localRefs'
import { confirmPick, newTracker, trackInstruments, type PickQuestion } from './track'
import type { LocalRefs } from './scan/scan'
import { useScan, type Scanner } from './scan/useScan'
import { boardFromLink, demoPick } from './boardLink'
import { isSlow, sendSlow, slowReadsOn } from './live/slowReads'
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

/** How long after a pick the Solver looks at the panel again: long enough for the new icon to land at the
 *  game's normal speed (the first picture is taken 0.4 s after the log goes quiet, measured at x4). */
const RELOOK_MS = 1500
/** Off while cards cut off mid-slide or under a hover are still shared as new ones (Oct 21). */
const SHARE_NEW_CARDS = false


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
  // in the app the Solver window is hidden: it comes up to ask
  useEffect(() => {
    if (askShelley) desktopBridge()?.showSolver?.()
  }, [])
  const [frame, setFrame] = useState<ImageData | null>(null)
  const [reading, setReading] = useState<Reading | null>(null)
  const [reading$, setReadingBusy] = useState(false)
  const [corrections, setCorrections] = useState<Record<FieldKey, string>>({})
  const [local, setLocal] = useState<LocalRefs>({})
  useEffect(() => void loadLocalRefs().then(setLocal), [])
  // in Vorax Overlay, the advice workers start and practice as the page loads, so the first board is as quick as the rest
  useEffect(() => {
    if (desktopBridge()) void warmUp().catch(() => {})
  }, [])
  const workerScan = useScan()
  const read = scanner ?? workerScan
  const canLive = liveSupported()
  const board = useMemo(() => ({ ...state, shelley }), [state, shelley])
  // a board just read is advised at once; one edited by hand waits for the next keystroke
  const fromRead = useRef(false)
  const { shown, updating } = useAdvice(board, fromRead.current)
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
  const [pickAsks, setPickAsks] = useState<{ id: number; question: PickQuestion; count: number; frame: ImageData; ui?: number; keep?: Keep }[]>(() => {
    const ask = linked && typeof location !== 'undefined' ? demoPick(location.search) : null
    return ask ? [{ id: ++askId, ...ask }] : []
  })
  // inside Vorax Overlay, the card over the game shows the same advice, and the question about an
  // instrument, since the app keeps this window hidden
  const [trouble, setTrouble] = useState<Trouble | null>(null)
  // a pick it isn't sure of: the advice for each instrument it could be, and whether the best move differs
  const snapAgain = useRef<(() => void) | null>(null)
  // the unrecognised cards of the last look (confirmUnknown)
  const unknownSeen = useRef(new Set<string>())
  // a pick still being checked (the next boards look again) counts too, before any question is asked
  const [checking, setChecking] = useState<PickQuestion | null>(null)
  const openPick = pickAsks[0]?.question ?? checking
  const options = useMemo(
    () => (openPick && board.hand.length ? openPick.offer.map(name => ({ name, board: { ...board, instruments: board.instruments.map((n, i) => (i === openPick.slot ? name : n)) } })) : null),
    [openPick, board],
  )
  const depends = dependsOn(useAlternatives(options))
  // a screen it can't read (most tanks unreadable, or pictures that aren't the game): said first
  const [notGame, setNotGame] = useState(0)
  const screen = linked ? null : screenTrouble({ filled: (reading?.state.tanks ?? []).filter(Boolean).length, unread: unreadTanks(fields, corrections).length, notGame })
  const troubles = [trouble, screen].filter((t): t is Trouble => !!t)
  // advice on a board it can't trust is paused, until fixed or the player asks for it anyway (for those
  // reasons only, until the page reloads: a new one pauses it again)
  const pauses = linked ? [] : pausesOf(troubles, askShelley)
  const [forced, setForced] = useState<Pause[]>([])
  const paused = stillPaused(pauses, forced)
  const unreliable = pauses.filter(p => forced.includes(p))
  const force = useRef(() => {})
  force.current = () => setForced(f => [...new Set([...f, ...paused])])
  useEffect(() => {
    desktopBridge()?.onForce?.(() => force.current())
  }, [])
  // cards the reader couldn't name on this board: the advice leaves them out, and they're reported so they can be added
  const unknownCards = reading?.state.phase === 'protocol' ? [] : (reading?.problems ?? []).flatMap(p => (p.kind === 'unknownArt' ? [Number(/\d+/.exec(p.field)?.[0] ?? 0) + 1] : []))
  // the Vorax screen closed or the run ended (the green boxes come off); finished: the run itself is done, and the
  // card says so instead of the last pick's advice
  const [over, setOver] = useState(false)
  const [finished, setFinished] = useState(false)
  const overRef = useRef(false)
  overRef.current = over
  useOverlay(shown, updating, overlayAsks(pickAsks.length, fields, corrections, askShelley, troubles, unknownCards), undefined, depends, pickAsks[0]?.question.offer ?? [], { paused, forced: unreliable }, finished)
  const retries = useRef(0)
  // a new board came in: the boxes come off at once, and stay off until it's read and advised on
  const [changing, setChanging] = useState(false)
  // the Vorax screen closed (or the run ended): the green boxes come off
  useHighlights(shown, updating, reading?.frame, reading?.ui, over || changing || paused.length > 0 || unreliable.length > 0 || !!depends)
  useEffect(() => {
    if (!advice?.final || !keepAdvice.current) return
    keepAdvice.current({ ...advice, hand: state.hand, phase: state.phase }, 'advice')
    keepAdvice.current = null
  }, [advice, state])

  // a windowed game's capture holds its title bar and borders, found in the picture: the game alone is read.
  // In the app, Windows says whether the game's window has a frame (its outer size isn't its picture's)
  const gamePicture = async (captured: ImageData) => {
    const win = await desktopBridge()?.gameWindow?.().catch(() => null)
    const framed = !!win && (win.outer[0] !== win.client[0] || win.outer[1] !== win.client[1])
    const area = windowedGame(captured, framed)
    const cut = area ? cropTo(captured, area) : null
    return cut ? (typeof ImageData === 'undefined' ? (cut as unknown as ImageData) : new ImageData(cut.data, cut.width, cut.height)) : captured
  }

  // A board that didn't read cleanly is looked at again soon, a few times (retry.ts)
  // pictures in the order they were taken, and the latest whose read was used
  const frames = useRef(0)
  const applied = useRef(0)
  const retryIfUnsure = (trigger: string | undefined, r: Reading) => {
    // the Vorax screen closed or the run over: nothing more to read
    if (overRef.current) return
    const next = nextLook(trigger, unsureReading(r), retries.current)
    retries.current = next.looks
    if (next.again) setTimeout(() => !overRef.current && snapAgain.current?.(), next.delay)
  }

  // A frame from Live or a screenshot becomes the board; fields the reader was unsure of are marked.
  const onFrame = async (captured: ImageData, trigger?: string, refs?: LocalRefs, keep?: Keep, snap?: SnapTiming) => {
    const seq = ++frames.current
    setReadingBusy(true)
    try {
      const img = await gamePicture(captured)
      const readFrom = Date.now()
      const read$ = await read(img, trigger, refs ?? local)
      const ms = Date.now() - readFrom
      console.info(`[timing] read the screen in ${ms} ms`)
      if (slowReadsOn() && isSlow(read$))
        void sendSlow(img, { ...read$, timing: { ...read$.timing, ...snap } }).then(f => console.info(`[timing] slow read saved: ${f}`), () => {})
      // a slow read (a card's name taking every try) finishing after a later picture's: that board is gone
      if (seq < applied.current) return console.info(`[timing] dropped the read of an older picture`)
      applied.current = seq
      const timed = snap ? { ...read$, timing: { ...read$.timing, ...snap } } : read$
      const raw = timed.debug ? { ...timed, debug: { ...timed.debug, ms } } : timed
      // a card flying off as it's played or picked: the last board and its advice still stand
      if (raw.problems.some(p => p.kind === 'animating')) {
        keep?.(raw, 'reading')
        retryIfUnsure(trigger, raw)
        return
      }
      // the game closing after round 13's last pick: the last board and its advice still stand
      if (gameClosing(state, raw, trigger)) {
        keep?.(raw, 'reading')
        return
      }
      setFrame(img)
      setNotGame(n => (raw.problems.some(p => p.kind === 'notFound') ? n + 1 : 0))
      let r = raw
      if (!raw.problems.some(p => p.kind === 'notFound')) {
        const t = trackInstruments(tracker.current, raw, trigger)
        tracker.current = t.tracker
        const ask = t.ask
        const open = t.tracker.unsure[0]
        setChecking(open ? { offer: open.offer, slot: open.slot } : null)
        // a new icon not clear on its first picture may still be sliding in: another look once it's landed
        if (t.tracker.unsure.some(q => q.looks === 0)) setTimeout(() => snapAgain.current?.(), RELOOK_MS)
        // a pick a later board showed clearly needs no answer
        if (t.settled.length) setPickAsks(list => list.filter(a => !t.settled.includes(a.question.slot)))
        if (ask) setPickAsks(list => [...list.filter(a => a.question.slot !== ask.slot), { id: ++askId, question: ask, count: t.instruments.length, frame: img, ui: raw.ui, keep }])
        const fields = Object.fromEntries(Object.entries(raw.fields).filter(([k]) => !k.startsWith('instrument')))
        r = { ...raw, state: { ...raw.state, instruments: t.instruments, instrumentRounds: t.rounds }, fields: { ...fields, ...t.fields } }
        // a round not read for sure: the one before stands in, not round 1
        const round = r.fields.round
        if (round && !round.sure) r = { ...r, state: { ...r.state, round: carriedRound(state, { round: r.state.round ?? 1, phase: r.state.phase, sure: false, guess: round.guess }) } }
      }
      // a card the Solver couldn't name: shared (with sharing on) so it can be added for everyone, once a second look
      // after it landed still can't name it
      if (SHARE_NEW_CARDS && !linked && r.state.phase !== 'protocol') {
        const u = confirmUnknown(unknownSeen.current, r.state.phase, r.state.round, r.problems)
        unknownSeen.current = u.seen
        for (const p of u.share) void shareCard({ phase: r.state.phase, text: p.text ?? '', picture: cardPicture(img, p.crop) })
        // a screenshot for the cards the reader is short of pictures of, or couldn't settle quickly (live reads only)
        if (trigger) void sendTraining(img, r, trainingWanted(r, new Set(u.share.map(p => p.field))))
        if (u.relook) setTimeout(() => snapAgain.current?.(), RELOOK_MS)
      }
      keep?.(r, 'reading')
      keepAdvice.current = keep ?? null
      retryIfUnsure(trigger, r)
      setChanging(false)
      setReading(r)
      setCorrections({})
      if (!r.problems.some(p => p.kind === 'notFound')) {
        fromRead.current = true
        setState(r.state)
        setFields(r.fields)
      }
    } finally {
      setReadingBusy(false)
    }
  }
  const recheck = () => frame && void onFrame(frame, reading?.frame?.trigger)

  const answerPick = async (id: number, name: string) => {
    const asked = pickAsks.find(a => a.id === id)
    if (!asked) return
    const { question, keep } = asked
    setPickAsks(list => list.filter(a => a.id !== id))
    tracker.current = confirmPick(tracker.current, question.slot, name)
    setChecking(c => (c?.slot === question.slot ? null : c))
    const owned = tracker.current.owned
    fromRead.current = false
    setState(s => ({ ...s, instruments: owned }))
    setFields(f => ({ ...f, [`instrument${question.slot}`]: { sure: true, guess: name } }))
    keep?.({ picked: name, slot: question.slot, offer: question.offer }, 'pick')
    if (!linked) setLocal(await loadLocalRefs())
  }

  // in the app: the instrument question answered with a click on the card, as if answered here
  const fromCard = useRef<(name: string) => void>(() => {})
  fromCard.current = (name: string) => {
    const a = pickAsks[0]
    if (!a || !a.question.offer.includes(name)) return
    void (async () => {
      if (!linked) await teachPick(a.frame, a.count, a.question, name, a.ui)
      await answerPick(a.id, name)
    })()
  }
  useEffect(() => {
    desktopBridge()?.onChoose?.(name => fromCard.current(name))
  }, [])

  const edit = (next: ScreenState, field: FieldKey) => {
    fromRead.current = false
    setState(next)
    if (reading) setCorrections(c => ({ ...c, [field]: valueOf(next, field) }))
    // a corrected instrument is the player's word: no longer an unsure pick
    if (field.startsWith('instrument')) {
      tracker.current = { ...tracker.current, owned: [...next.instruments], unsure: tracker.current.unsure.filter(q => `instrument${q.slot}` !== field) }
      setChecking(c => (c && `instrument${c.slot}` === field ? null : c))
    }
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
        <a className={styles.support} href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
          <span aria-hidden="true">☕</span> Buy me a coffee
        </a>
        <details className={styles.about}>
          <summary>What can this see?</summary>
          <ul>
            <li>Reads only the log file you give it, from the moment you connect it.</li>
            <li>Sees only the one window you share, and only when the log shows a move or you press Snap now.</li>
            <li>Pictures stay in this browser and are gone when you close the tab, but for the few below.</li>
            <li>Never clicks or types for you.</li>
            <li>Shares the boards it reads (tanks, cards offered, instruments, round), with no picture, no account and nothing about you: only a random install number, to count players. Turn it off with the switch beside Board state.</li>
            <li>With each board, to find out why some setups misread: the picture’s size, your screen’s scaling, whether it’s HDR, your browser and its version, how the numbers read, and in the app whether the game is windowed. No picture, no name, nothing that lasts from one day to the next.</li>
            <li>When you say which instrument you picked, shares that name and the icon's small grey pattern, never a screenshot.</li>
            <li>With the switch on, so it learns the cards it reads badly: for a card it doesn’t recognise, a small picture of that card alone; and for a card it has almost no pictures of, or couldn’t read quickly, sometimes one picture of the game window (never the rest of your screen). Each card is wanted only a few times from all players, and at most once from you.</li>
          </ul>
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
            <LiveSource onFrame={(img, trigger, keep, timing) => void onFrame(img, trigger, undefined, keep, timing)} onTrouble={setTrouble} snap={snapAgain} onChanged={() => setChanging(true)} onOver={(o, f) => (setOver(o), setFinished(f))} />
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

      {paused.length > 0 ? (
        <PausedPanel pauses={paused} onForce={() => force.current()} />
      ) : (
        <>
          {unreliable.length > 0 && <UnreliableNote pauses={unreliable} onPause={() => setForced([])} />}
          <AdvicePanel advice={shown?.advice ?? null} updating={updating} state={shown?.board ?? state} iconsKnown={reading?.iconsKnown} unread={unreadTanks(fields, corrections)} depends={depends} />
        </>
      )}
      {pickAsks.map(a => (
        <WhichPick key={a.id} question={a.question} count={a.count} frame={a.frame} ui={a.ui} onPicked={name => void answerPick(a.id, name)} onSkip={() => setPickAsks(list => list.filter(x => x.id !== a.id))} learn={!linked} />
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
    </main>
  )
}
