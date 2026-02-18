import type { GameState } from "@/game/models";
import { useMemo } from "react";
import styles from "./AppShell.module.css";
import SettingsIconButton from "./SettingsIconButton";

type ManualOutcome = number | "doubles";

interface GameplayPanelProps {
  canRoll: boolean;
  canBank: boolean;
  gameState: GameState;
  diceOne: number;
  diceTwo: number;
  isDiceAnimating: boolean;
  diceInputError: string | null;
  isManualMode: boolean;
  selectedOutcome: ManualOutcome | null;
  onRoll: () => void;
  onManualOutcomeSelect: (outcome: ManualOutcome) => void;
  onBankPlayer: (playerId: string) => void;
  onOpenSettings: () => void;
  onOpenRollHistory: () => void;
  isSettingsOpen: boolean;
}

const FACE_PIP_INDEXES: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function buildPlayerRowClassNames(
  isActivePlayer: boolean,
  hasBankedThisRound: boolean,
  isLeader: boolean,
): string {
  return [
    styles.playerRow,
    isActivePlayer ? styles.playerRowActive : "",
    hasBankedThisRound ? styles.playerRowBanked : "",
    isLeader ? styles.playerRowLeader : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildDieClassNames(isAnimating: boolean): string {
  return [styles.die, isAnimating ? styles.dieAnimating : ""]
    .filter(Boolean)
    .join(" ");
}

function buildPipClassNames(isVisible: boolean): string {
  return [styles.pip, isVisible ? styles.pipVisible : ""]
    .filter(Boolean)
    .join(" ");
}

function renderDieFace(value: number, isAnimating: boolean, label: string) {
  const activePips = new Set(FACE_PIP_INDEXES[value] ?? FACE_PIP_INDEXES[1]);

  return (
    <div
      className={buildDieClassNames(isAnimating)}
      role="img"
      aria-label={`${label}: ${value}`}
    >
      {Array.from({ length: 9 }, (_, pipIndex) => (
        <span
          // Keep a stable pip grid so face updates do not remount nodes per frame.
          key={`${label}-pip-${pipIndex}`}
          className={buildPipClassNames(activePips.has(pipIndex))}
        />
      ))}
    </div>
  );
}

export default function GameplayPanel({
  canRoll,
  canBank,
  gameState,
  diceOne,
  diceTwo,
  isDiceAnimating,
  diceInputError,
  isManualMode,
  selectedOutcome,
  onRoll,
  onManualOutcomeSelect,
  onBankPlayer,
  onOpenSettings,
  onOpenRollHistory,
  isSettingsOpen,
}: GameplayPanelProps) {
  const highestScore = useMemo(
    () =>
      gameState.players.reduce(
        (currentHighestScore, player) =>
          Math.max(currentHighestScore, player.score),
        0,
      ),
    [gameState.players],
  );

  const sortedPlayers = useMemo(
    () =>
      [...gameState.players].sort((a, b) => {
        if (a.hasBankedThisRound && !b.hasBankedThisRound) return 1;
        if (!a.hasBankedThisRound && b.hasBankedThisRound) return -1;
        return 0;
      }),
    [gameState.players],
  );
  const pastTurnThree = gameState.round.turnCountInRound >= 3;

  return (
    <>
      <div className={styles.gameplayHeader}>
        <div className={styles.gameplayRoundBlock}>
          <p className={styles.gameplayRoundValue}>
            Round {gameState.round.currentRound} of{" "}
            {gameState.settings.roundCount}
          </p>
        </div>
        <div className={styles.gameplayHeaderActions}>
          <button
            className={styles.button}
            type="button"
            onClick={onOpenRollHistory}
          >
            Roll History
          </button>
          <SettingsIconButton
            isOpen={isSettingsOpen}
            onClick={onOpenSettings}
          />
        </div>
      </div>

      <section className={styles.bankCard} aria-label="Communal bank">
        <h2 id="gameplay-heading" className={styles.bankLabel}>
          Round Total
        </h2>
        <output
          className={styles.bankTotal}
          aria-live="polite"
          data-testid="communal-bank-total"
        >
          ${gameState.round.bankTotal}
        </output>
      </section>

      {!isManualMode && (
        <section className={styles.dicePanel} aria-label="Dice tray">
          <button
            className={styles.diceRollButton}
            type="button"
            onClick={onRoll}
            disabled={!canRoll}
            aria-label={isDiceAnimating ? "Rolling..." : "Roll"}
            aria-keyshortcuts="R"
          >
            <div className={styles.diceRow} data-testid="dice-tray">
              {renderDieFace(diceOne, isDiceAnimating, "Die one")}
              {renderDieFace(diceTwo, isDiceAnimating, "Die two")}
            </div>
          </button>
        </section>
      )}

      {isManualMode && (
        <section
          className={styles.manualDicePanel}
          aria-label="Manual dice outcome selection"
        >
          <h3 className={styles.sectionHeading}>Select dice outcome</h3>
          <div className={styles.manualDiceButtons}>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((sum) => (
              <button
                key={sum}
                type="button"
                className={`${styles.manualDiceButton} ${selectedOutcome === sum ? styles.manualDiceButtonSelected : ""} ${pastTurnThree && sum === 7 ? styles.manualDiceButtonRed : ""}`}
                onClick={() => onManualOutcomeSelect(sum)}
                disabled={pastTurnThree && (sum === 2 || sum === 12)}
                aria-pressed={selectedOutcome === sum}
                aria-label={`Select sum ${sum}`}
              >
                {sum}
              </button>
            ))}
            <button
              type="button"
              className={`${styles.manualDiceButton} ${selectedOutcome === "doubles" ? styles.manualDiceButtonSelected : ""}`}
              onClick={() => onManualOutcomeSelect("doubles")}
              disabled={gameState.round.turnCountInRound <= 3}
              aria-pressed={selectedOutcome === "doubles"}
              aria-label="Select doubles"
            >
              Doubles
            </button>
          </div>
          {diceInputError && (
            <p className={styles.errorText} role="alert">
              {diceInputError}
            </p>
          )}
        </section>
      )}

      <ol className={styles.scoreboard} aria-label="Scoreboard">
        {sortedPlayers.map((player) => {
          const isActivePlayer =
            player.id ===
            gameState.players[gameState.turn.activePlayerIndex].id;
          const isLeader = highestScore > 0 && player.score === highestScore;
          const canBankPlayer = canBank && !player.hasBankedThisRound;
          const scoreFillWidth =
            highestScore === 0
              ? "0%"
              : `${Math.round((player.score / highestScore) * 100)}%`;

          return (
            <li
              key={player.id}
              aria-current={isActivePlayer ? "true" : undefined}
            >
              <button
                type="button"
                className={[
                  buildPlayerRowClassNames(
                    isActivePlayer,
                    player.hasBankedThisRound,
                    isLeader,
                  ),
                  styles.playerRowAction,
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onBankPlayer(player.id)}
                disabled={!canBankPlayer}
              >
                <div className={styles.playerIdentity}>
                  <div className={styles.playerNameRow}>
                    <span className={styles.playerName}>{player.name}</span>
                    <div className={styles.playerBadgeRow}>
                      {isLeader && (
                        <span className={styles.leaderBadge}>Leader</span>
                      )}
                      <span
                        className={
                          player.hasBankedThisRound
                            ? styles.bankedBadge
                            : styles.waitingBadge
                        }
                      >
                        {player.hasBankedThisRound ? "Banked" : "In Round"}
                      </span>
                    </div>
                  </div>
                  <div className={styles.scoreTrack} aria-hidden="true">
                    <span
                      className={styles.scoreFill}
                      style={{ width: scoreFillWidth }}
                    />
                  </div>
                </div>
                <div>
                  <p className={styles.playerScore}>${player.score}</p>
                  {pastTurnThree &&
                    gameState.round.bankTotal > 0 &&
                    !player.hasBankedThisRound && (
                      <p className={styles.playerPotentialScore}>
                        Potential ${player.score + gameState.round.bankTotal}
                      </p>
                    )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {!isManualMode && diceInputError && (
        <p className={styles.errorText} role="alert">
          {diceInputError}
        </p>
      )}
    </>
  );
}
