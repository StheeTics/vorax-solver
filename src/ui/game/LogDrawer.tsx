import { useEffect, useRef } from 'react'
import type { LogEntry } from '@/engine/types'
import styles from './LogDrawer.module.css'

export function LogDrawer({ log, open, onClose }: { log: LogEntry[]; open: boolean; onClose(): void }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) end.current?.scrollIntoView?.({ block: 'end' })
  }, [open, log.length])
  return (
    <aside className={styles.drawer} data-open={open} aria-hidden={!open}>
      <div className={styles.head}>
        <span>Surgery Log</span>
        <button className="ghost-button" onClick={onClose} aria-label="Close log">✕</button>
      </div>
      <div className={styles.list}>
        {log.map((entry, i) => {
          const newRound = i === 0 || log[i - 1].round !== entry.round
          return (
            <div key={i}>
              {newRound && <div className={styles.round}>Round {entry.round}</div>}
              <div className={styles.entry} data-kind={entry.kind}>{entry.text}</div>
            </div>
          )
        })}
        <div ref={end} />
      </div>
    </aside>
  )
}
