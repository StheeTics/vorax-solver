import { useState } from 'react'
import type { FieldKey, Reading, Source } from '../types'
import { toPng } from '../live/windowCapture'
import { buildReport, issueLink, reportTitle } from './report'
import styles from './ReportBox.module.css'

interface Props {
  reading: Reading | null
  corrections: Record<FieldKey, string>
  source: Source
  frame: ImageData | null
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

/** When the reader missed something: a report to paste into a GitHub issue, and the pictures to attach. */
export function ReportBox({ reading, corrections, source, frame }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!reading) return null
  const problems = reading.problems.length > 0
  const corrected = Object.keys(corrections).length > 0
  if (!problems && !corrected) return null
  if (!problems && !open)
    return (
      <button type="button" className={styles.quiet} onClick={() => setOpen(true)}>Reading was wrong? Report it</button>
    )

  const text = buildReport(reading, { build: BUILD, userAgent: navigator.userAgent, source, corrections })
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
  const save = async () => {
    if (!frame) return
    await download(frame, 'vorax-frame.png')
    let n = 0
    for (const p of reading.problems) if (p.kind === 'unknownArt') await download(cropOf(frame, p.crop), `vorax-unknown-${++n}.png`)
  }

  return (
    <section className={`panel-frame ${styles.box}`} aria-label="Report this">
      <h2>Report this</h2>
      <p className={styles.small}>Something on your screen wasn’t read. A report helps fix it for everyone: copy it, open an issue, and drag in the saved screenshot.</p>
      <textarea id="solver-report" className={styles.text} readOnly value={text} rows={8} />
      <div className={styles.row}>
        <button type="button" className="ghost-button" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</button>
        <a className="gold-button" href={url} target="_blank" rel="noopener noreferrer">Open an issue on GitHub</a>
        {frame && <button type="button" className="ghost-button" onClick={() => void save()}>Save screenshot</button>}
      </div>
      {!prefilled && <p className={styles.small}>The report is too long for the link. Copy it and paste it into the issue.</p>}
    </section>
  )
}
