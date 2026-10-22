import { SIMULATOR_URL, SOLVER_URL } from '@/ui/links'
import styles from './Landing.module.css'

/** The surgical tanks of the event's screen: six, as in the game, glowing behind the title. */
function Tanks() {
  return (
    <div className={styles.tanks} aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={styles.tank} style={{ '--i': i } as React.CSSProperties} />
      ))}
    </div>
  )
}

export function Landing() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.kicker}>Torchlight Infinite · Vorax</div>
        <h1 className={styles.title}>Surgical Preparation</h1>
        <Tanks />
        <p className={styles.tagline}>Know which potion to play, every round.</p>
      </header>

      <div className={styles.choices}>
        <section className={`${styles.card} ${styles.solver}`} aria-labelledby="solver-name">
          <h2 id="solver-name" className={styles.name}>Solver</h2>
          <p className={styles.blurb}>Advice for your real game: the best card, its target and how the run should end, as each hand is dealt.</p>
          <div className={styles.actions}>
            <a className={`gold-button ${styles.primary}`} href={SOLVER_URL}>Open the Solver</a>
          </div>
          <p className={styles.note}>Read-only. It looks at your screen and log; it never clicks or types for you.</p>
        </section>

        <section className={styles.card} aria-labelledby="simulator-name">
          <h2 id="simulator-name" className={styles.name}>Simulator</h2>
          <p className={styles.blurb}>Practise full runs, set up any board in the sandbox, and read the Optimal Play guide.</p>
          <a className={`ghost-button ${styles.open}`} href={SIMULATOR_URL}>Open the Simulator</a>
        </section>
      </div>

      <section className={styles.how} aria-labelledby="how-title">
        <h2 id="how-title" className={styles.howTitle}>How the Solver works</h2>
        <ol className={styles.steps} aria-label="How the Solver works">
          <li>
            <strong>Turn on the game’s log.</strong> In the game, press Esc, open Account Related, click Enable Log, then log out and back in. Once is enough.
          </li>
          <li>
            <strong>Open the Solver and connect your game.</strong> Drop in the game’s log file and share the game window. It only looks when the log shows a move.
          </li>
          <li>
            <strong>Play.</strong> Each time cards are dealt, the advice shows which one to take and where to play it.
          </li>
        </ol>
      </section>
    </main>
  )
}
