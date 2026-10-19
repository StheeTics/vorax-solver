import { Attribution } from '@/ui/Attribution'
import { Footnote } from '@/ui/Footnote'
import { DOWNLOAD_URL, SIMULATOR_URL, SOLVER_URL } from '@/ui/links'
import styles from './Landing.module.css'

export function Landing() {
  return (
    <main className={styles.page}>
      <header className={styles.titleBlock}>
        <div className={styles.kicker}>Torchlight Infinite · Vorax</div>
        <h1 className={styles.title}>Surgical Preparation</h1>
      </header>
      <div className={styles.choices}>
        <div className={styles.choice}>
          <a className={styles.card} href={SIMULATOR_URL}>
            <span className={styles.name}>Simulator</span>
            <span className={styles.blurb}>Practice runs, sandbox, and the Optimal Play guide.</span>
          </a>
        </div>
        <div className={styles.choice}>
          <a className={styles.card} href={SOLVER_URL}>
            <span className={styles.name}>Solver</span>
            <span className={styles.blurb}>Live advice for your real game, from a screenshot or by following your game.</span>
          </a>
          <p className={styles.note}>Read-only. It looks at your screen and log; it never clicks or types for you.</p>
          <p className={styles.note}>
            Windows: <a href={DOWNLOAD_URL}>Download Vorax Overlay</a>, the Solver as an app with its advice over the game. It finds the game and its log by itself.
          </p>
        </div>
      </div>
      <footer className={styles.footer}>
        <Attribution className={styles.credit} />
        <Footnote className={styles.footnote} />
      </footer>
    </main>
  )
}
