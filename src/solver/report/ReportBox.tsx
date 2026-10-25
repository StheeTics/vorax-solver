import { useState } from 'react'
import type { Advice, ScreenState } from '@/strategy/advisor'
import type { FieldKey, Reading, Source } from '../types'
import { toPng } from '../live/windowCapture'
import { buildReport, issueLink, reportTitle } from './report'
import styles from './ReportBox.module.css'

interface Props {
  reading: Reading | null
  corrections: Record<FieldKey, string>
  source: Source
  frame: ImageData | null
  /** the advice shown for this board, reported beside what was read */
  advice?: { board: ScreenState; advice: Advice } | null
}

const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev'

async function download(img: ImageData, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(await toPng(img))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function cropOf(img: ImageData, r: { x: number; y: number; w: number; h: number }): ImageData {
  const w = Math.max(1, Math.round(r.w)), h = Math.max(1, Math.round(r.h))
  const out = new ImageData(w, h)
  for (let y = 0; y < h; y++) {
    const from = ((Math.round(r.y) + y) * img.width + Math.round(r.x)) * 4
    out.data.set(img.data.subarray(from, from + w * 4), y * w * 4)
  }
  return out
}

/** A report to paste into a GitHub issue: what was read, the advice shown and the game screenshot, copied to the
 *  clipboard to paste in. Open by itself when the reader missed something; behind "Report this board" otherwise. */
export function ReportBox({ reading, corrections, source, frame, advice }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shot, setShot] = useState<'copied' | 'failed' | null>(null)
  if (!reading) return null
  const problems = reading.problems.length > 0
  if (!problems && !open)
    return (
      <button type="button" className={styles.quiet} onClick={() => setOpen(true)}>Report this board</button>
    )

  const text = buildReport(reading, { build: BUILD, userAgent: navigator.userAgent, source, corrections, advice })
  const { url, prefilled } = issueLink(reportTitle(reading), text)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      const area = document.getElementById('solver-report') as HTMLTextAreaElement | null
      area?.select()
    }
  }
  // the picture goes on the clipboard (to paste into the issue) in the same click that opens it: a link opened
  // after waiting for the picture would be blocked as a popup
  const report = () => {
    if (frame && typeof ClipboardItem !== 'undefined')
      navigator.clipboard.write([new ClipboardItem({ 'image/png': toPng(frame) })]).then(() => setShot('copied'), () => setShot('failed'))
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const save = async () => {
    if (!frame) return
    await download(frame, 'vorax-frame.png')
    let n = 0
    for (const p of reading.problems) if (p.kind === 'unknownArt') await download(cropOf(frame, p.crop), `vorax-unknown-${++n}.png`)
  }

  return (
    <section className={`panel-frame ${styles.box}`} aria-label="Report this board">
      <h2>Report this board</h2>
      <p className={styles.small}>
        {problems ? 'Something on your screen wasn’t read. ' : ''}A report helps fix misreads and odd advice for everyone. It opens an issue on GitHub with
        what the Solver read and advised filled in{frame ? ', and copies the game’s screenshot: paste it into the issue with Ctrl+V' : ''}. Nothing is sent until
        you submit the issue.
      </p>
      <textarea id="solver-report" className={styles.text} readOnly value={text} rows={8} />
      <div className={styles.row}>
        <button type="button" className="gold-button" onClick={report}>{frame ? 'Copy screenshot and open an issue' : 'Open an issue on GitHub'}</button>
        <button type="button" className="ghost-button" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy report'}</button>
        {frame && <button type="button" className="ghost-button" onClick={() => void save()}>Save screenshot</button>}
      </div>
      {shot === 'copied' && <p className={styles.small} role="status">Screenshot copied: paste it into the issue with Ctrl+V.</p>}
      {shot === 'failed' && <p className={styles.small} role="status">The screenshot couldn’t be copied: save it and drag it into the issue.</p>}
      {!prefilled && <p className={styles.small}>The report is too long for the link. Copy it and paste it into the issue.</p>}
    </section>
  )
}
