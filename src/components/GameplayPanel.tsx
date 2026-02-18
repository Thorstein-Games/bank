import type { GameState } from "@/game/models";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AppShell.module.css";
import SettingsIconButton from "./SettingsIconButton";
import { buildClassNames } from "./app-shell/appShellUtils";

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
  bankedScorePopups: Record<string, { amount: number; sequenceId: number }>;
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
const ROUND_TOTAL_ANIMATION_TICK_MS = 16;
const ROUND_TOTAL_MIN_DURATION_MS = 140;
const ROUND_TOTAL_MAX_DURATION_MS = 280;

function getRoundTotalAnimationDuration(delta: number): number {
  const scaledDuration = 140 + Math.log10(delta + 1) * 90;
  return Math.min(
    ROUND_TOTAL_MAX_DURATION_MS,
    Math.max(ROUND_TOTAL_MIN_DURATION_MS, scaledDuration),
  );
}

function buildPlayerRowClassNames(
  isActivePlayer: boolean,
  hasBankedThisRound: boolean,
  isLeader: boolean,
): string {
  return buildClassNames(
    styles.playerRow,
    isActivePlayer ? styles.playerRowActive : "",
    hasBankedThisRound ? styles.playerRowBanked : "",
    isLeader ? styles.playerRowLeader : "",
  );
}

function buildDieClassNames(isAnimating: boolean): string {
  return buildClassNames(styles.die, isAnimating ? styles.dieAnimating : "");
}

function buildPipClassNames(isVisible: boolean): string {
  return buildClassNames(styles.pip, isVisible ? styles.pipVisible : "");
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
  bankedScorePopups,
  onRoll,
  onManualOutcomeSelect,
  onBankPlayer,
  onOpenSettings,
  onOpenRollHistory,
  isSettingsOpen,
}: GameplayPanelProps) {
  const [displayedBankTotal, setDisplayedBankTotal] = useState(
    gameState.round.bankTotal,
  );
  const [isRoundTotalTicking, setIsRoundTotalTicking] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const bankTotalAnimationIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const displayedBankTotalRef = useRef(displayedBankTotal);

  useEffect(() => {
    displayedBankTotalRef.current = displayedBankTotal;
  }, [displayedBankTotal]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncPreference);
      return () => mediaQuery.removeEventListener("change", syncPreference);
    }

    mediaQuery.addListener(syncPreference);
    return () => mediaQuery.removeListener(syncPreference);
  }, []);

  useEffect(() => {
    const nextBankTotal = gameState.round.bankTotal;
    const previousDisplayedBankTotal = displayedBankTotalRef.current;

    if (bankTotalAnimationIntervalRef.current !== null) {
      clearInterval(bankTotalAnimationIntervalRef.current);
      bankTotalAnimationIntervalRef.current = null;
    }

    if (nextBankTotal <= previousDisplayedBankTotal || prefersReducedMotion) {
      setDisplayedBankTotal(nextBankTotal);
      setIsRoundTotalTicking(false);
      return;
    }

    const delta = nextBankTotal - previousDisplayedBankTotal;
    const duration = getRoundTotalAnimationDuration(delta);
    const startedAt = Date.now();

    setIsRoundTotalTicking(true);
    bankTotalAnimationIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const animatedValue = Math.floor(
        previousDisplayedBankTotal + delta * easedProgress,
      );

      setDisplayedBankTotal(animatedValue);

      if (progress >= 1) {
        if (bankTotalAnimationIntervalRef.current !== null) {
          clearInterval(bankTotalAnimationIntervalRef.current);
          bankTotalAnimationIntervalRef.current = null;
        }
        setDisplayedBankTotal(nextBankTotal);
        setIsRoundTotalTicking(false);
      }
    }, ROUND_TOTAL_ANIMATION_TICK_MS);
  }, [gameState.round.bankTotal, prefersReducedMotion]);

  useEffect(
    () => () => {
      if (bankTotalAnimationIntervalRef.current !== null) {
        clearInterval(bankTotalAnimationIntervalRef.current);
      }
    },
    [],
  );

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
        return b.score - a.score || 0;
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
          className={[
            styles.bankTotal,
            isRoundTotalTicking ? styles.bankTotalTicking : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-live="polite"
          data-testid="communal-bank-total"
        >
          ${displayedBankTotal}
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
              disabled={!pastTurnThree}
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
          const scoreboardItemClassName = [
            styles.scoreboardItem,
            canBankPlayer ? styles.scoreboardItemBankable : "",
          ]
            .filter(Boolean)
            .join(" ");
          const scoreFillWidth =
            highestScore === 0
              ? "0%"
              : `${Math.round((player.score / highestScore) * 100)}%`;
          const bankedScorePopup = bankedScorePopups[player.id];

          return (
            <li
              key={player.id}
              className={scoreboardItemClassName}
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
                      <span
                        className={
                          player.hasBankedThisRound
                            ? styles.bankedBadge
                            : styles.waitingBadge
                        }
                      >
                        {player.hasBankedThisRound ? "Banked" : "In Round"}
                      </span>
                      <span
                        className={buildClassNames(
                          styles.leaderBadge,
                          isLeader ? styles.leaderBadgeActive : "",
                        )}
                      >
                        Leader
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
                  <div className={styles.playerScoreWrap}>
                    {bankedScorePopup && (
                      <span
                        key={`${player.id}-${bankedScorePopup.sequenceId}`}
                        className={styles.playerScoreGain}
                        aria-hidden="true"
                      >
                        +${bankedScorePopup.amount}
                      </span>
                    )}
                    <p className={styles.playerScore}>${player.score}</p>
                  </div>
                  <p
                    className={buildClassNames(
                      styles.playerPotentialScore,
                      pastTurnThree &&
                        gameState.round.bankTotal > 0 &&
                        !player.hasBankedThisRound
                        ? styles.showPlayerPotentialScore
                        : "",
                    )}
                  >
                    Potential ${player.score + gameState.round.bankTotal}
                  </p>
                </div>
              </button>
              {canBankPlayer ? (
                <span className={styles.bankTooltip} aria-hidden="true">
                  Bank
                </span>
              ) : null}
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
