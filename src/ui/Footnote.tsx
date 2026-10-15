import { IssueLink } from './IssueLink'
import styles from './Footnote.module.css'

export function Footnote({ className }: { className?: string }) {
  return (
    <p className={`${styles.footnote} ${className ?? ''}`}>
      Fan-made practice tool. Some card names are literal translations. · <IssueLink className={styles.link} />
    </p>
  )
}
