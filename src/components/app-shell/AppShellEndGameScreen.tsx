import type { GameScreen, Player } from "@/game/models";
import styles from "../AppShell.module.css";
import { buildClassNames } from "./appShellUtils";

interface AppShellEndGameScreenProps {
  activeScreen: GameScreen;
  finalStandings: Player[];
  winnerIdSet: Set<string>;
  winnerSummary: string;
  onOpenRollHistory: () => void;
  onPlayAgain: () => void;
  onEditNextGameSettings: () => void;
}

export default function AppShellEndGameScreen({
  activeScreen,
  finalStandings,
  winnerIdSet,
  winnerSummary,
  onOpenRollHistory,
  onPlayAgain,
  onEditNextGameSettings,
}: AppShellEndGameScreenProps) {
  return (
    <section
      className={styles.section}
      aria-labelledby="end-of-game-heading"
      hidden={activeScreen !== "end-of-game"}
    >
      <div className={styles.endScreen}>
        <div className={styles.endHero}>
          <p className={styles.endKicker}>Match Complete</p>
          <h2 id="end-of-game-heading" className={styles.sectionHeading}>
            End of Game
          </h2>
          <p className={styles.endSummary}>{winnerSummary}</p>
          <div className={styles.actionRow}>
            <button
              className={buildClassNames(styles.button, styles.subtleButton)}
              type="button"
              onClick={onOpenRollHistory}
            >
              Roll History
            </button>
          </div>
        </div>
        <ol className={styles.endScoreboard} aria-label="Final scoreboard">
          {finalStandings.map((player, index) => {
            const isWinner = winnerIdSet.has(player.id);

            return (
              <li
                key={player.id}
                className={buildClassNames(
                  styles.endPlayerCard,
                  isWinner ? styles.endPlayerCardWinner : "",
                )}
              >
                <p className={styles.endPlacement}>#{index + 1}</p>
                <div className={styles.endPlayerNameRow}>
                  <span className={styles.playerName}>{player.name}</span>
                  {isWinner && (
                    <span className={styles.winnerBadge}>
                      <span aria-hidden="true">🏆</span>
                      <span>Winner</span>
                    </span>
                  )}
                </div>
                <p className={styles.endScoreLabel}>Final pot</p>
                <p className={styles.endPlayerScore}>${player.score}</p>
              </li>
            );
          })}
        </ol>
      </div>
      <div className={buildClassNames(styles.actionRow, styles.endActionRow)}>
        <button
          className={buildClassNames(styles.button, styles.primaryButton)}
          type="button"
          onClick={onPlayAgain}
        >
          Play Again
        </button>
        <button
          className={buildClassNames(styles.button, styles.secondaryButton)}
          type="button"
          onClick={onEditNextGameSettings}
        >
          Change Settings for Next Game
        </button>
      </div>
    </section>
  );
}
