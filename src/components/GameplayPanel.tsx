import type { GameState } from "@/game/models";
import { useEffect, useMemo, useRef } from "react";
import styles from "./AppShell.module.css";

type ManualDieField = "dieOne" | "dieTwo";

interface GameplayPanelProps {
  canRoll: boolean;
  canBank: boolean;
  gameState: GameState;
  diceOne: number;
  diceTwo: number;
  isDiceAnimating: boolean;
  diceInputError: string | null;
  isManualMode: boolean;
  manualDieOneValue: string;
  manualDieTwoValue: string;
  onRoll: () => void;
  onManualDieInputChange: (field: ManualDieField, nextValue: string) => void;
  onBankActivePlayer: () => void;
  onBankPlayer: (playerId: string) => void;
  onAdvanceTurn: () => void;
}

const FACE_PIP_INDEXES: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

function buildPlayerRowClassNames(
  isActivePlayer: boolean,
  hasBankedThisRound: boolean,
  isLeader: boolean
): string {
  return [
    styles.playerRow,
    isActivePlayer ? styles.playerRowActive : "",
    hasBankedThisRound ? styles.playerRowBanked : "",
    isLeader ? styles.playerRowLeader : ""
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

function buildButtonClassNames(...classNames: string[]): string {
  return classNames.filter(Boolean).join(" ");
}

function renderDieFace(value: number, isAnimating: boolean, label: string) {
  const activePips = new Set(FACE_PIP_INDEXES[value] ?? FACE_PIP_INDEXES[1]);

  return (
    <div className={buildDieClassNames(isAnimating)} role="img" aria-label={`${label}: ${value}`}>
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
  manualDieOneValue,
  manualDieTwoValue,
  onRoll,
  onManualDieInputChange,
  onBankActivePlayer,
  onBankPlayer,
  onAdvanceTurn
}: GameplayPanelProps) {
  const activeRoundPlayers = useMemo(
    () => gameState.players.filter((player) => !player.hasBankedThisRound),
    [gameState.players]
  );
  const activePlayer = gameState.players[gameState.turn.activePlayerIndex] ?? null;
  const highestScore = useMemo(
    () =>
      gameState.players.reduce(
        (currentHighestScore, player) => Math.max(currentHighestScore, player.score),
        0
      ),
    [gameState.players]
  );
  const rollButtonRef = useRef<HTMLButtonElement | null>(null);
  const bankButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousCanRollRef = useRef(canRoll);
  const previousCanBankRef = useRef(canBank);

  useEffect(() => {
    if (canBank && !previousCanBankRef.current) {
      bankButtonRef.current?.focus();
    }

    previousCanBankRef.current = canBank;
  }, [canBank]);

  useEffect(() => {
    if (canRoll && !previousCanRollRef.current) {
      rollButtonRef.current?.focus();
    }

    previousCanRollRef.current = canRoll;
  }, [canRoll]);

  return (
    <>
      <div className={styles.gameplayHeader}>
        <div>
          <h2 id="gameplay-heading" className={styles.sectionHeading}>
            Gameplay
          </h2>
          <p className={styles.sectionCopy}>
            Round {gameState.round.currentRound} of {gameState.settings.roundCount}
          </p>
        </div>
        <div className={styles.turnMarker} aria-live="polite">
          <span className={styles.turnLabel}>Active player</span>
          <span className={styles.turnPlayer}>{activePlayer?.name ?? "Waiting..."}</span>
        </div>
      </div>

      <section className={styles.bankCard} aria-label="Communal bank">
        <p className={styles.bankLabel}>Communal Bank Total</p>
        <output
          className={styles.bankTotal}
          aria-live="polite"
          data-testid="communal-bank-total"
        >
          {gameState.round.bankTotal}
        </output>
        <p className={styles.bankPrompt}>
          {gameState.turn.hasRolledThisTurn
            ? "Bank now or push your luck."
            : "Roll to build the jackpot."}
        </p>
        {gameState.turn.lastRoll && (
          <p className={styles.sectionCopy}>
            Last roll: {gameState.turn.lastRoll.dieOne} + {gameState.turn.lastRoll.dieTwo} ={" "}
            {gameState.turn.lastRoll.total}
          </p>
        )}
      </section>

      <section className={styles.dicePanel} aria-label="Dice tray">
        <p className={styles.dicePanelLabel}>Dice Tray</p>
        <div className={styles.diceRow} data-testid="dice-tray">
          {renderDieFace(diceOne, isDiceAnimating, "Die one")}
          {renderDieFace(diceTwo, isDiceAnimating, "Die two")}
        </div>
        <p className={styles.sectionCopy} aria-live="polite">
          {isDiceAnimating ? "Rolling dice..." : `Dice showing ${diceOne} and ${diceTwo}.`}
        </p>
      </section>

      {isManualMode && (
        <section className={styles.manualDicePanel} aria-label="Manual dice input">
          <h3 className={styles.sectionHeading}>Manual dice input</h3>
          <div className={styles.manualDiceRow}>
            <label className={styles.manualDiceField} htmlFor="manual-die-one">
              <span className={styles.label}>Die one</span>
              <input
                id="manual-die-one"
                className={styles.input}
                type="number"
                min={1}
                max={6}
                step={1}
                inputMode="numeric"
                value={manualDieOneValue}
                onChange={(event) =>
                  onManualDieInputChange("dieOne", event.target.value)
                }
                aria-invalid={Boolean(diceInputError)}
                aria-describedby={diceInputError ? "manual-dice-error" : undefined}
              />
            </label>
            <label className={styles.manualDiceField} htmlFor="manual-die-two">
              <span className={styles.label}>Die two</span>
              <input
                id="manual-die-two"
                className={styles.input}
                type="number"
                min={1}
                max={6}
                step={1}
                inputMode="numeric"
                value={manualDieTwoValue}
                onChange={(event) =>
                  onManualDieInputChange("dieTwo", event.target.value)
                }
                aria-invalid={Boolean(diceInputError)}
                aria-describedby={diceInputError ? "manual-dice-error" : undefined}
              />
            </label>
          </div>
          {diceInputError && (
            <p id="manual-dice-error" className={styles.errorText} role="alert">
              {diceInputError}
            </p>
          )}
        </section>
      )}

      <ol className={styles.scoreboard} aria-label="Scoreboard">
        {gameState.players.map((player, index) => {
          const isActivePlayer = index === gameState.turn.activePlayerIndex;
          const isLeader = highestScore > 0 && player.score === highestScore;
          const scoreFillWidth =
            highestScore === 0 ? "0%" : `${Math.round((player.score / highestScore) * 100)}%`;

          return (
            <li
              key={player.id}
              className={buildPlayerRowClassNames(
                isActivePlayer,
                player.hasBankedThisRound,
                isLeader
              )}
              aria-current={isActivePlayer ? "true" : undefined}
            >
              <div className={styles.playerIdentity}>
                <div className={styles.playerNameRow}>
                  <span className={styles.playerName}>{player.name}</span>
                  {isLeader && <span className={styles.leaderBadge}>Leader</span>}
                </div>
                <div className={styles.playerBadgeRow}>
                  {isActivePlayer && <span className={styles.activeBadge}>Active</span>}
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
                <div className={styles.scoreTrack} aria-hidden="true">
                  <span className={styles.scoreFill} style={{ width: scoreFillWidth }} />
                </div>
              </div>
              <p className={styles.playerScore}>Score {player.score}</p>
            </li>
          );
        })}
      </ol>

      <div className={styles.actionRow}>
        <button
          ref={rollButtonRef}
          className={buildButtonClassNames(styles.button, styles.primaryButton)}
          type="button"
          onClick={onRoll}
          disabled={!canRoll}
          aria-keyshortcuts="R"
        >
          {isDiceAnimating ? "Rolling..." : "Roll"}
        </button>
        <button
          ref={bankButtonRef}
          className={buildButtonClassNames(styles.button, styles.secondaryButton)}
          type="button"
          onClick={onBankActivePlayer}
          disabled={!canBank || !activePlayer || activePlayer.hasBankedThisRound}
          aria-keyshortcuts="B"
        >
          Bank
        </button>
        <p className={styles.shortcutHint}>Shortcuts: R = roll, B = bank active player.</p>
      </div>

      {!isManualMode && diceInputError && (
        <p className={styles.errorText} role="alert">
          {diceInputError}
        </p>
      )}

      {gameState.turn.hasRolledThisTurn && (
        <section className={styles.postTurnPanel} aria-label="Post-turn banking">
          <h3 className={styles.sectionHeading}>Post-turn banking</h3>
          <p className={styles.sectionCopy}>
            Any active player can bank now, or continue without banking.
          </p>
          <div className={styles.postTurnActions}>
            {activeRoundPlayers.map((player) => (
              <button
                key={player.id}
                className={buildButtonClassNames(styles.button, styles.subtleButton)}
                type="button"
                onClick={() => onBankPlayer(player.id)}
              >
                Bank {player.name}
              </button>
            ))}
            <button
              className={buildButtonClassNames(styles.button, styles.primaryButton)}
              type="button"
              onClick={onAdvanceTurn}
            >
              Continue Turn
            </button>
          </div>
        </section>
      )}
    </>
  );
}
