import { useEffect, useMemo, useRef, useState } from 'react'
import type { ScreenState } from '@/strategy/advisor'
import { Attribution } from '@/ui/Attribution'
import { Footnote } from '@/ui/Footnote'
import { HOME_URL } from '@/ui/links'
import { loadShelleyLevel, saveShelleyLevel } from '@/ui/settingsStore'
import { AdvicePanel } from './advice/AdvicePanel'
import { useAdvice } from './advice/useAdvice'
import { BoardPanel } from './board/BoardPanel'
import { FrameView } from './board/FrameView'
import { LiveSource } from './live/LiveSource'
import { ScreenshotSource } from './screenshot/ScreenshotSource'
import { ReportBox } from './report/ReportBox'
import { ShareSwitch } from './share/ShareSwitch'
import { useShare } from './share/useShare'
import { WhatIsThis } from './board/WhatIsThis'
import { WhichPick } from './board/WhichPick'
import { forgetLocalRefs, loadLocalRefs } from './scan/localRefs'
import { newTracker, trackInstruments, type PickQuestion } from './track'
import type { LocalRefs } from './scan/scan'
import { useScan, type Scanner } from './scan/useScan'
import { loadSource, saveSource } from './sourceStore'
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

interface Unknown { id: number; frame: ImageData; phase: 'potion' | 'instrument'; problem: Extract<Reading['problems'][number], { kind: 'unknownArt' }> }
const MAX_UNKNOWNS = 6
let unknownId = 0

const SOURCES: { id: Source; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'manual', label: 'Manual' },
]

export function SolverApp({ scanner }: { scanner?: Scanner } = {}) {
  const [source, setSource] = useState(loadSource)
  const [state, setState] = useState<ScreenState>(emptyState)
  const [fields, setFields] = useState<Record<FieldKey, FieldRead>>({})
  const [shelley, setShelley] = useState(loadShelleyLevel)
  const [frame, setFrame] = useState<ImageData | null>(null)
  const [reading, setReading] = useState<Reading | null>(null)
  const [reading$, setReadingBusy] = useState(false)
  const [corrections, setCorrections] = useState<Record<FieldKey, string>>({})
  const [local, setLocal] = useState<LocalRefs>({})
  // unknown cards wait here until named or skipped: the next board would otherwise replace them mid-choice
  const [unknowns, setUnknowns] = useState<Unknown[]>([])
  useEffect(() => void loadLocalRefs().then(setLocal), [])
  const workerScan = useScan()
  useShare(reading, source, shelley, corrections)
  const read = scanner ?? workerScan
  const canLive = liveSupported()
  const board = useMemo(() => ({ ...state, shelley }), [state, shelley])
  const { advice, refining } = useAdvice(board)
  // capture mode: the final advice for a saved frame is saved beside it
  const keepAdvice = useRef<Keep | null>(null)
  // instruments are remembered through a game rather than re-read from their small icons each time
  const tracker = useRef(newTracker())
  // a pick the tracker can't place waits here for the player's answer
  const [pickAsk, setPickAsk] = useState<{ question: PickQuestion; count: number; frame: ImageData; keep?: Keep } | null>(null)
  useEffect(() => {
    if (!advice?.final || !keepAdvice.current) return
    keepAdvice.current({ ...advice, hand: state.hand, phase: state.phase }, 'advice')
    keepAdvice.current = null
  }, [advice, state])

  // A frame from Live or a screenshot becomes the board; fields the reader was unsure of are marked.
  const onFrame = async (img: ImageData, trigger?: string, refs?: LocalRefs, keep?: Keep) => {
    setReadingBusy(true)
    try {
      const raw = await read(img, trigger, refs ?? local)
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
        if (t.ask) setPickAsk({ question: t.ask, count: t.instruments.length, frame: img, keep })
        const fields = Object.fromEntries(Object.entries(raw.fields).filter(([k]) => !k.startsWith('instrument')))
        r = { ...raw, state: { ...raw.state, instruments: t.instruments }, fields: { ...fields, ...t.fields } }
      }
      keep?.(r, 'reading')
      keepAdvice.current = keep ?? null
      setReading(r)
      const fresh = r.problems.flatMap(p => (p.kind === 'unknownArt' && r.state.phase !== 'protocol' ? [{ id: ++unknownId, frame: img, phase: r.state.phase, problem: p }] : []))
      if (fresh.length) setUnknowns(u => [...u, ...fresh].slice(-MAX_UNKNOWNS))
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
  const named$ = Object.keys(local).length
  const forget = async () => {
    await forgetLocalRefs()
    setLocal({})
  }
  const named = async (id: number) => {
    setUnknowns(u => u.filter(x => x.id !== id))
    const refs = await loadLocalRefs()
    setLocal(refs)
    if (frame) await onFrame(frame, reading?.frame?.trigger, refs)
  }

  const answerPick = async (name: string) => {
    if (!pickAsk) return
    const { question, keep } = pickAsk
    setPickAsk(null)
    const owned = [...tracker.current.owned]
    owned[question.slot] = name
    tracker.current = { ...tracker.current, owned }
    setState(s => ({ ...s, instruments: owned }))
    setFields(f => ({ ...f, [`instrument${question.slot}`]: { sure: true, guess: name } }))
    keep?.({ picked: name, slot: question.slot, offer: question.offer }, 'pick')
    setLocal(await loadLocalRefs())
  }

  const pick = (s: Source) => {
    setSource(s)
    saveSource(s)
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
            <li>Shares the boards it reads (tanks, cards offered, instruments, round), with no picture, no account and nothing about you. Turn it off with the switch under the advice.</li>
            <li>When you say which instrument you picked, shares that name and the icon's small grey pattern, never a screenshot.</li>
          </ul>
          <Attribution />
        </details>
      </header>
      <aside className={styles.wip} role="note" aria-label="Work in progress">
        <strong>Work in progress.</strong> The odds behind the advice are still being tuned from live games, and some
        instruments aren't known to the Solver yet. Every game you play with it, with sharing on, helps improve it.
      </aside>

      <div className={styles.sources} role="radiogroup" aria-label="Where the board comes from">
        {SOURCES.map(s => (
          <label key={s.id} className={styles.source} data-on={source === s.id}>
            <input type="radio" name="source" value={s.id} checked={source === s.id} disabled={s.id === 'live' && !canLive} onChange={() => pick(s.id)} />
            {s.label}
          </label>
        ))}
      </div>
      {!canLive && <p className={styles.note}>Live needs Chrome or Edge on a PC. Screenshot and Manual work here.</p>}

      {source === 'live' && canLive && <LiveSource onFrame={(img, trigger, keep) => void onFrame(img, trigger, undefined, keep)} />}
      {source === 'screenshot' && <ScreenshotSource onFrame={img => void onFrame(img)} />}
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

      {pickAsk && <WhichPick question={pickAsk.question} count={pickAsk.count} frame={pickAsk.frame} onPicked={name => void answerPick(name)} onSkip={() => setPickAsk(null)} />}
      {unknowns.map(u => (
        <WhatIsThis key={u.id} problem={u.problem} phase={u.phase} frame={u.frame} onNamed={() => void named(u.id)} onSkip={() => setUnknowns(list => list.filter(x => x.id !== u.id))} />
      ))}
      <BoardPanel state={state} fields={fields} onChange={edit} shelley={shelley} onShelley={changeShelley} />
      <ReportBox reading={reading} corrections={corrections} source={source} frame={frame} />
      {named$ > 0 && (
        <button type="button" className={styles.quiet} onClick={() => void forget()}>
          Forget the {named$} card{named$ === 1 ? '' : 's'} I named
        </button>
      )}
      <AdvicePanel advice={advice} refining={refining} state={state} iconsKnown={reading?.iconsKnown} />
      <ShareSwitch />

      <Footnote className={styles.footnote} />
    </main>
  )
}
