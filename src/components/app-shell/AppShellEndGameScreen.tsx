import type { GameScreen, Player } from "@/game/models";
import styles from "../AppShell.module.css";
import { buildClassNames, type EndGameStats } from "./appShellUtils";

interface AppShellEndGameScreenProps {
  activeScreen: GameScreen;
  finalStandings: Player[];
  winnerIdSet: Set<string>;
  winnerSummary: string;
  endGameStats: EndGameStats;
  onOpenRollHistory: () => void;
  onPlayAgain: () => void;
  onEditNextGameSettings: () => void;
}

export default function AppShellEndGameScreen({
  activeScreen,
  finalStandings,
  winnerIdSet,
  winnerSummary,
  endGameStats,
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
        <section
          className={styles.endStatsSection}
          aria-labelledby="end-stats-heading"
        >
          <h3 id="end-stats-heading" className={styles.endStatsHeading}>
            Match Stats
          </h3>
          <dl className={styles.endStatsGrid} aria-label="End game stats">
            <div className={styles.endStatCard}>
              <dt className={styles.endStatLabel}>Max bank potential</dt>
              <dd className={styles.endStatValue}>
                ${endGameStats.maxBankPotential}
              </dd>
            </div>
            <div className={styles.endStatCard}>
              <dt className={styles.endStatLabel}>Longest round</dt>
              <dd className={styles.endStatValue}>
                {endGameStats.longestRoundTurns} turns
              </dd>
            </div>
            <div className={styles.endStatCard}>
              <dt className={styles.endStatLabel}>Avg doubles / round</dt>
              <dd className={styles.endStatValue}>
                {endGameStats.averageDoublesPerRound.toFixed(1)}
              </dd>
            </div>
            <div className={styles.endStatCard}>
              <dt className={styles.endStatLabel}>Avg turns / round</dt>
              <dd className={styles.endStatValue}>
                {endGameStats.averageTurnsPerRound.toFixed(1)}
              </dd>
            </div>
            <div className={styles.endStatCard}>
              <dt className={styles.endStatLabel}>Bust rate</dt>
              <dd className={styles.endStatValue}>
                {endGameStats.bustRatePercent.toFixed(1)}%
              </dd>
            </div>
            <div className={styles.endStatCard}>
              <dt className={styles.endStatLabel}>Hot roll</dt>
              <dd className={styles.endStatValue}>
                {endGameStats.hottestNumber === null
                  ? "N/A"
                  : `${endGameStats.hottestNumber}`}
              </dd>
            </div>
          </dl>
          <div className={styles.endProbabilityBlock}>
            <p className={styles.endProbabilityHeading}>
              Roll probability (this game, totals 2-12)
            </p>
            <div className={styles.endProbabilityGrid}>
              {endGameStats.numberProbabilities.map((item) => (
                <div
                  key={item.total}
                  className={styles.endProbabilityItem}
                  data-testid={`end-roll-prob-${item.total}`}
                >
                  <span className={styles.endProbabilityTotal}>
                    {item.total}
                  </span>
                  <span className={styles.endProbabilityPercent}>
                    {item.probabilityPercent.toFixed(1)}%
                  </span>
                  <span className={styles.endProbabilityCount}>
                    {item.count}/{endGameStats.totalRolls}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
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
