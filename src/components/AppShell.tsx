import type { GameScreen } from "@/game/models";
import styles from "./AppShell.module.css";

const ACTIVE_SCREEN: GameScreen = "setup";

export default function AppShell() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bank Dice Game</h1>
        <p className={styles.subtitle}>
          Phase 1 app shell with setup, gameplay, and end-of-game containers.
        </p>
      </header>

      <div className={styles.stage}>
        <section
          className={styles.section}
          aria-labelledby="setup-heading"
          hidden={ACTIVE_SCREEN !== "setup"}
        >
          <h2 id="setup-heading" className={styles.sectionHeading}>
            Setup
          </h2>
          <p className={styles.sectionCopy}>
            Player inputs and game options will be rendered here.
          </p>
          <div className={styles.actionRow}>
            <button className={styles.button} type="button" disabled>
              Start Game
            </button>
          </div>
        </section>

        <section
          className={styles.section}
          aria-labelledby="gameplay-heading"
          hidden={ACTIVE_SCREEN !== "gameplay"}
        >
          <h2 id="gameplay-heading" className={styles.sectionHeading}>
            Gameplay
          </h2>
          <p className={styles.sectionCopy}>
            Turn actions, bank total, and scoreboard will be rendered here.
          </p>
          <div className={styles.actionRow}>
            <button className={styles.button} type="button" disabled>
              Roll
            </button>
            <button className={styles.button} type="button" disabled>
              Bank
            </button>
          </div>
        </section>

        <section
          className={styles.section}
          aria-labelledby="end-of-game-heading"
          hidden={ACTIVE_SCREEN !== "end-of-game"}
        >
          <h2 id="end-of-game-heading" className={styles.sectionHeading}>
            End of Game
          </h2>
          <p className={styles.sectionCopy}>
            Winner summary and restart controls will be rendered here.
          </p>
          <div className={styles.actionRow}>
            <button className={styles.button} type="button" disabled>
              Play Again
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
