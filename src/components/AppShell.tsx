"use client";

import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROUND_COUNT_PRESETS
} from "@/game/constants";
import useDiceRollController from "@/hooks/useDiceRollController";
import type { GameScreen, GameState } from "@/game/models";
import { type GameAction, gameReducer } from "@/game/reducer";
import {
  clearPersistedGameSnapshot,
  GAME_SAVE_SCHEMA_VERSION,
  type PersistedGameSnapshot,
  readPersistedGameSnapshot,
  writePersistedGameSnapshot
} from "@/state/persistence";
import {
  buildSetupConfig,
  createDefaultSetupState,
  createInitialGameState,
  CUSTOM_ROUND_COUNT,
  resizePlayerNames,
  validateSetup
} from "@/state";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./AppShell.module.css";
import GameplayPanel from "./GameplayPanel";

const PLAYER_COUNT_OPTIONS = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, index) => MIN_PLAYERS + index
);

function getWinnerNames(gameState: GameState): string[] {
  return gameState.status.winnerIds
    .map((winnerId) => gameState.players.find((player) => player.id === winnerId)?.name)
    .filter((winnerName): winnerName is string => Boolean(winnerName));
}

export default function AppShell() {
  const [setupState, setSetupState] = useState(createDefaultSetupState);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [resumeSnapshot, setResumeSnapshot] = useState<PersistedGameSnapshot | null>(
    null
  );
  const [hasLoadedSavedGame, setHasLoadedSavedGame] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const setupValidation = useMemo(
    () => validateSetup(setupState),
    [setupState]
  );

  const dispatchGameAction = useCallback((action: GameAction) => {
    setGameState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return gameReducer(currentState, action);
    });
  }, []);

  const {
    diceOne,
    diceTwo,
    isDiceAnimating,
    pendingRoll,
    isManualMode,
    isManualInputValid,
    diceInputError,
    manualDieOneValue,
    manualDieTwoValue,
    resetDiceState,
    setStableDiceDisplay,
    handleRoll,
    handleManualDieInputChange
  } = useDiceRollController({
    gameState,
    dispatchGameAction
  });

  useEffect(() => {
    setResumeSnapshot(readPersistedGameSnapshot());
    setHasLoadedSavedGame(true);
  }, []);

  const activeScreen: GameScreen = gameState ? gameState.status.screen : "setup";
  const showResumePrompt =
    hasLoadedSavedGame && gameState === null && resumeSnapshot !== null;
  const activePlayer = gameState
    ? gameState.players[gameState.turn.activePlayerIndex] ?? null
    : null;
  const canRoll = Boolean(
    gameState &&
      activePlayer &&
      !gameState.turn.hasRolledThisTurn &&
      !activePlayer.hasBankedThisRound &&
      !isDiceAnimating &&
      (!isManualMode || isManualInputValid)
  );
  const canBank = Boolean(gameState && gameState.turn.hasRolledThisTurn);
  const winnerNames = gameState ? getWinnerNames(gameState) : [];

  useEffect(() => {
    if (!hasLoadedSavedGame || showResumePrompt) {
      return;
    }

    if (!gameState) {
      clearPersistedGameSnapshot();
      return;
    }

    writePersistedGameSnapshot({
      schemaVersion: GAME_SAVE_SCHEMA_VERSION,
      gameState,
      pendingRoll
    });
  }, [gameState, pendingRoll, hasLoadedSavedGame, showResumePrompt]);

  function handlePlayerCountChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextCount = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(nextCount)) {
      return;
    }

    setSetupState((currentState) => ({
      ...currentState,
      playerNames: resizePlayerNames(currentState.playerNames, nextCount)
    }));
  }

  function handlePlayerNameChange(index: number, nextValue: string) {
    setSetupState((currentState) => {
      const nextPlayerNames = [...currentState.playerNames];
      nextPlayerNames[index] = nextValue;
      return {
        ...currentState,
        playerNames: nextPlayerNames
      };
    });
  }

  function handleRoundCountChange(event: ChangeEvent<HTMLInputElement>) {
    const optionValue = event.target.value;
    setSetupState((currentState) => ({
      ...currentState,
      roundCountOption:
        optionValue === CUSTOM_ROUND_COUNT
          ? CUSTOM_ROUND_COUNT
          : (Number.parseInt(optionValue, 10) as (typeof ROUND_COUNT_PRESETS)[number])
    }));
  }

  function handleStartGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const setupConfig = buildSetupConfig(setupState);
    if (!setupConfig) {
      return;
    }

    resetDiceState();
    setIsSettingsOpen(false);
    setResumeSnapshot(null);
    setGameState(createInitialGameState(setupConfig));
  }

  function handleResumeGame() {
    if (!resumeSnapshot) {
      return;
    }

    resetDiceState();

    let hydratedGameState = resumeSnapshot.gameState;
    if (resumeSnapshot.pendingRoll) {
      hydratedGameState = gameReducer(hydratedGameState, {
        type: "resolve-roll",
        dieOne: resumeSnapshot.pendingRoll.dieOne,
        dieTwo: resumeSnapshot.pendingRoll.dieTwo
      });
      setStableDiceDisplay(resumeSnapshot.pendingRoll);
    } else if (resumeSnapshot.gameState.turn.lastRoll) {
      setStableDiceDisplay(resumeSnapshot.gameState.turn.lastRoll);
    }

    setIsSettingsOpen(false);
    setGameState(hydratedGameState);
    setResumeSnapshot(null);
  }

  function handleStartNewGame() {
    resetDiceState();
    setSetupState(createDefaultSetupState());
    setGameState(null);
    setResumeSnapshot(null);
    setIsSettingsOpen(false);
    clearPersistedGameSnapshot();
  }

  function handleClearSavedGame() {
    setResumeSnapshot(null);
    clearPersistedGameSnapshot();
  }

  function handleBankActivePlayer() {
    if (!activePlayer) {
      return;
    }

    dispatchGameAction({
      type: "bank-player",
      playerId: activePlayer.id
    });
  }

  function handleBankPlayer(playerId: string) {
    dispatchGameAction({
      type: "bank-player",
      playerId
    });
  }

  function handleAdvanceTurn() {
    dispatchGameAction({
      type: "advance-turn"
    });
  }

  function handlePlayAgain() {
    if (!gameState) {
      return;
    }

    resetDiceState();
    setResumeSnapshot(null);
    setIsSettingsOpen(false);
    setGameState(
      createInitialGameState({
        playerNames: gameState.players.map((player) => player.name),
        roundCount: gameState.settings.roundCount,
        diceMode: gameState.settings.diceMode,
        theme: gameState.settings.theme
      })
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bank Dice Game</h1>
        <p className={styles.subtitle}>
          Configure players and options, then lock setup to begin gameplay.
        </p>
      </header>

      <div className={styles.stage}>
        <section
          className={styles.section}
          aria-labelledby="setup-heading"
          hidden={activeScreen !== "setup"}
        >
          <h2 id="setup-heading" className={styles.sectionHeading}>
            Setup
          </h2>
          {showResumePrompt ? (
            <div className={styles.resumePrompt} role="dialog" aria-modal="false">
              <p className={styles.sectionCopy}>
                Saved game found. Resume where you left off or start a new game.
              </p>
              <div className={styles.actionRow}>
                <button className={styles.button} type="button" onClick={handleResumeGame}>
                  Resume Game
                </button>
                <button className={styles.button} type="button" onClick={handleStartNewGame}>
                  New Game
                </button>
              </div>
            </div>
          ) : (
            <form className={styles.setupForm} onSubmit={handleStartGame} noValidate>
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Players</legend>
                <label className={styles.label} htmlFor="player-count">
                  Player count
                </label>
                <select
                  id="player-count"
                  className={styles.input}
                  value={setupState.playerNames.length}
                  onChange={handlePlayerCountChange}
                >
                  {PLAYER_COUNT_OPTIONS.map((playerCount) => (
                    <option key={playerCount} value={playerCount}>
                      {playerCount}
                    </option>
                  ))}
                </select>
                {setupValidation.playerCountError && (
                  <p className={styles.errorText} role="alert">
                    {setupValidation.playerCountError}
                  </p>
                )}
                <div className={styles.playerGrid}>
                  {setupState.playerNames.map((playerName, index) => {
                    const playerError = setupValidation.playerErrors[index];
                    const fieldId = `player-name-${index + 1}`;
                    const errorId = `${fieldId}-error`;

                    return (
                      <label key={fieldId} className={styles.playerField} htmlFor={fieldId}>
                        <span className={styles.label}>Player {index + 1}</span>
                        <input
                          id={fieldId}
                          className={styles.input}
                          type="text"
                          value={playerName}
                          onChange={(event) =>
                            handlePlayerNameChange(index, event.target.value)
                          }
                          aria-invalid={Boolean(playerError)}
                          aria-describedby={playerError ? errorId : undefined}
                          autoComplete="off"
                        />
                        {playerError && (
                          <span id={errorId} className={styles.errorText} role="alert">
                            {playerError}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Rounds</legend>
                <div className={styles.radioRow}>
                  {ROUND_COUNT_PRESETS.map((preset) => (
                    <label key={preset} className={styles.optionLabel}>
                      <input
                        type="radio"
                        name="round-count"
                        value={preset}
                        checked={setupState.roundCountOption === preset}
                        onChange={handleRoundCountChange}
                      />
                      <span>{preset} rounds</span>
                    </label>
                  ))}
                  <label className={styles.optionLabel}>
                    <input
                      type="radio"
                      name="round-count"
                      value={CUSTOM_ROUND_COUNT}
                      checked={setupState.roundCountOption === CUSTOM_ROUND_COUNT}
                      onChange={handleRoundCountChange}
                    />
                    <span>Custom</span>
                  </label>
                </div>
                <label className={styles.label} htmlFor="custom-round-count">
                  Custom round count
                </label>
                <input
                  id="custom-round-count"
                  className={styles.input}
                  type="number"
                  min={1}
                  step={1}
                  value={setupState.customRoundCount}
                  disabled={setupState.roundCountOption !== CUSTOM_ROUND_COUNT}
                  onChange={(event) =>
                    setSetupState((currentState) => ({
                      ...currentState,
                      customRoundCount: event.target.value
                    }))
                  }
                  aria-invalid={Boolean(setupValidation.roundCountError)}
                  aria-describedby={
                    setupValidation.roundCountError ? "custom-round-error" : undefined
                  }
                />
                {setupValidation.roundCountError && (
                  <p id="custom-round-error" className={styles.errorText} role="alert">
                    {setupValidation.roundCountError}
                  </p>
                )}
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Dice Mode</legend>
                <div className={styles.radioRow}>
                  <label className={styles.optionLabel}>
                    <input
                      type="radio"
                      name="dice-mode"
                      value="built-in"
                      checked={setupState.diceMode === "built-in"}
                      onChange={() =>
                        setSetupState((currentState) => ({
                          ...currentState,
                          diceMode: "built-in"
                        }))
                      }
                    />
                    <span>Built-in</span>
                  </label>
                  <label className={styles.optionLabel}>
                    <input
                      type="radio"
                      name="dice-mode"
                      value="manual"
                      checked={setupState.diceMode === "manual"}
                      onChange={() =>
                        setSetupState((currentState) => ({
                          ...currentState,
                          diceMode: "manual"
                        }))
                      }
                    />
                    <span>Manual input</span>
                  </label>
                </div>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Theme</legend>
                <div className={styles.radioRow}>
                  <label className={styles.optionLabel}>
                    <input
                      type="radio"
                      name="theme"
                      value="system"
                      checked={setupState.theme === "system"}
                      onChange={() =>
                        setSetupState((currentState) => ({
                          ...currentState,
                          theme: "system"
                        }))
                      }
                    />
                    <span>System</span>
                  </label>
                  <label className={styles.optionLabel}>
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={setupState.theme === "light"}
                      onChange={() =>
                        setSetupState((currentState) => ({
                          ...currentState,
                          theme: "light"
                        }))
                      }
                    />
                    <span>Light</span>
                  </label>
                  <label className={styles.optionLabel}>
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={setupState.theme === "dark"}
                      onChange={() =>
                        setSetupState((currentState) => ({
                          ...currentState,
                          theme: "dark"
                        }))
                      }
                    />
                    <span>Dark</span>
                  </label>
                </div>
              </fieldset>

              <div className={styles.actionRow}>
                <button
                  className={styles.button}
                  type="submit"
                  disabled={!setupValidation.isValid}
                >
                  Start Game
                </button>
              </div>
            </form>
          )}
        </section>

        <section
          className={styles.section}
          aria-labelledby="gameplay-heading"
          hidden={activeScreen !== "gameplay"}
        >
          {gameState && (
            <GameplayPanel
              canRoll={canRoll}
              canBank={canBank}
              gameState={gameState}
              diceOne={diceOne}
              diceTwo={diceTwo}
              isDiceAnimating={isDiceAnimating}
              diceInputError={diceInputError}
              isManualMode={isManualMode}
              manualDieOneValue={manualDieOneValue}
              manualDieTwoValue={manualDieTwoValue}
              isSettingsOpen={isSettingsOpen}
              onToggleSettings={() =>
                setIsSettingsOpen((currentValue) => !currentValue)
              }
              onRoll={handleRoll}
              onManualDieInputChange={handleManualDieInputChange}
              onBankActivePlayer={handleBankActivePlayer}
              onBankPlayer={handleBankPlayer}
              onAdvanceTurn={handleAdvanceTurn}
              onClearSavedGame={handleClearSavedGame}
            />
          )}
        </section>

        <section
          className={styles.section}
          aria-labelledby="end-of-game-heading"
          hidden={activeScreen !== "end-of-game"}
        >
          <h2 id="end-of-game-heading" className={styles.sectionHeading}>
            End of Game
          </h2>
          {gameState && (
            <>
              <p className={styles.sectionCopy}>
                {winnerNames.length > 1
                  ? `Winners: ${winnerNames.join(", ")}`
                  : `Winner: ${winnerNames[0] ?? "No winner"}`
                }
              </p>
              <ol className={styles.scoreboard} aria-label="Final scoreboard">
                {gameState.players.map((player) => (
                  <li key={player.id} className={styles.playerRow}>
                    <span className={styles.playerName}>{player.name}</span>
                    <span className={styles.playerScore}>{player.score}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className={styles.actionRow}>
            <button className={styles.button} type="button" onClick={handlePlayAgain}>
              Play Again
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
