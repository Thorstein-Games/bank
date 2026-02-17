"use client";

import { MAX_PLAYERS, MIN_PLAYERS } from "@/game/constants";
import type { GameScreen, GameState, ThemePreference } from "@/game/models";
import { type GameAction, gameReducer } from "@/game/reducer";
import useDiceRollController, {
  type RollResolutionFeedback
} from "@/hooks/useDiceRollController";
import useGameAudio from "@/hooks/useGameAudio";
import {
  buildSetupConfig,
  createDefaultSetupState,
  createInitialGameState,
  resizePlayerNames,
  resolveRoundCount,
  validateSetup
} from "@/state";
import {
  clearPersistedGameSnapshot,
  GAME_SAVE_SCHEMA_VERSION,
  type PersistedGameSnapshot,
  readPersistedAudioMuted,
  readPersistedGameSnapshot,
  readPersistedThemePreference,
  writePersistedAudioMuted,
  writePersistedGameSnapshot,
  writePersistedThemePreference
} from "@/state/persistence";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./AppShell.module.css";
import ConfettiBurst from "./ConfettiBurst";
import GameplayPanel from "./GameplayPanel";
import SettingsPanel from "./SettingsPanel";

const PLAYER_COUNT_OPTIONS = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, index) => MIN_PLAYERS + index
);

interface LiveAnnouncement {
  id: number;
  text: string;
}

function createSetupStateWithTheme(theme: ThemePreference) {
  return {
    ...createDefaultSetupState(),
    theme
  };
}

function getWinnerNames(gameState: GameState): string[] {
  return gameState.status.winnerIds
    .map((winnerId) => gameState.players.find((player) => player.id === winnerId)?.name)
    .filter((winnerName): winnerName is string => Boolean(winnerName));
}

function isShortcutInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

function buildWinnerAnnouncement(winnerNames: string[]): string {
  if (winnerNames.length === 0) {
    return "Game complete. No winner recorded.";
  }

  if (winnerNames.length === 1) {
    return `Game complete. Winner: ${winnerNames[0]}.`;
  }

  return `Game complete. Winners: ${winnerNames.join(", ")}.`;
}

function buildButtonClassNames(...classNames: string[]): string {
  return classNames.filter(Boolean).join(" ");
}

export default function AppShell() {
  const [setupState, setSetupState] = useState(createDefaultSetupState);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [resumeSnapshot, setResumeSnapshot] = useState<PersistedGameSnapshot | null>(
    null
  );
  const [hasLoadedSavedGame, setHasLoadedSavedGame] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [politeAnnouncement, setPoliteAnnouncement] = useState<LiveAnnouncement>({
    id: 0,
    text: ""
  });
  const [assertiveAnnouncement, setAssertiveAnnouncement] =
    useState<LiveAnnouncement>({
      id: 0,
      text: ""
    });
  const [isConfettiActive, setIsConfettiActive] = useState(false);
  const previousScreenRef = useRef<GameScreen>("setup");

  const announcePolite = useCallback((text: string) => {
    setPoliteAnnouncement((currentAnnouncement) => ({
      id: currentAnnouncement.id + 1,
      text
    }));
  }, []);

  const announceAssertive = useCallback((text: string) => {
    setAssertiveAnnouncement((currentAnnouncement) => ({
      id: currentAnnouncement.id + 1,
      text
    }));
  }, []);

  const setupValidation = useMemo(
    () => validateSetup(setupState),
    [setupState]
  );
  const activeTheme = gameState?.settings.theme ?? setupState.theme;
  const hasSavedGame = Boolean(gameState || resumeSnapshot);

  const dispatchGameAction = useCallback((action: GameAction) => {
    setGameState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return gameReducer(currentState, action);
    });
  }, []);

  const { playRollSound, playBankSound } = useGameAudio({
    isMuted: isAudioMuted,
    hasUserInteracted
  });

  const handleRollResolved = useCallback(
    (rollResult: RollResolutionFeedback) => {
      if (!gameState) {
        return;
      }

      const activePlayerName =
        gameState.players[gameState.turn.activePlayerIndex]?.name ?? "Active player";

      if (rollResult.isBust) {
        announceAssertive(
          `Bust. ${activePlayerName} rolled ${rollResult.dieOne} and ${rollResult.dieTwo}. The round ended immediately.`
        );
        return;
      }

      const bonusText =
        rollResult.total === 7 ? " Early 7 bonus applied." : "";
      announcePolite(
        `${activePlayerName} rolled ${rollResult.dieOne} and ${rollResult.dieTwo} for ${rollResult.total}. Communal bank is ${rollResult.nextBankTotal}.${bonusText}`
      );
    },
    [announceAssertive, announcePolite, gameState]
  );

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
    dispatchGameAction,
    onBuiltInRollStart: playRollSound,
    onRollResolved: handleRollResolved
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const markInteracted = () => setHasUserInteracted(true);
    window.addEventListener("pointerdown", markInteracted);
    window.addEventListener("keydown", markInteracted);

    return () => {
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    };
  }, []);

  useEffect(() => {
    const persistedThemePreference = readPersistedThemePreference();
    if (persistedThemePreference) {
      setSetupState((currentState) => ({
        ...currentState,
        theme: persistedThemePreference
      }));
    }

    setIsAudioMuted(readPersistedAudioMuted());
    setResumeSnapshot(readPersistedGameSnapshot());
    setHasLoadedSavedGame(true);
  }, []);

  useEffect(() => {
    const rootElement = document.documentElement;
    if (activeTheme === "system") {
      rootElement.removeAttribute("data-theme");
      return;
    }

    rootElement.setAttribute("data-theme", activeTheme);
  }, [activeTheme]);

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
  const setupRoundCount =
    resolveRoundCount(setupState.roundCountOption, setupState.customRoundCount) ?? 0;
  const handleBankPlayer = useCallback(
    (playerId: string) => {
      if (!gameState || !gameState.turn.hasRolledThisTurn) {
        return;
      }

      const player = gameState.players.find(
        (candidatePlayer) => candidatePlayer.id === playerId
      );
      if (!player || player.hasBankedThisRound) {
        return;
      }

      const bankedAmount = gameState.round.bankTotal;
      const nextScore = player.score + bankedAmount;

      dispatchGameAction({
        type: "bank-player",
        playerId
      });
      playBankSound();
      announcePolite(`${player.name} banked ${bankedAmount}. New score: ${nextScore}.`);
    },
    [announcePolite, dispatchGameAction, gameState, playBankSound]
  );
  const handleBankActivePlayer = useCallback(() => {
    if (!activePlayer) {
      return;
    }

    handleBankPlayer(activePlayer.id);
  }, [activePlayer, handleBankPlayer]);

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

  useEffect(() => {
    if (!gameState) {
      previousScreenRef.current = "setup";
      setIsConfettiActive(false);
      return;
    }

    if (
      gameState.status.screen === "end-of-game" &&
      previousScreenRef.current !== "end-of-game"
    ) {
      announceAssertive(buildWinnerAnnouncement(getWinnerNames(gameState)));
      setIsConfettiActive(true);
    } else if (gameState.status.screen !== "end-of-game") {
      setIsConfettiActive(false);
    }

    previousScreenRef.current = gameState.status.screen;
  }, [announceAssertive, gameState]);

  useEffect(() => {
    if (!isConfettiActive) {
      return;
    }

    const confettiTimeout = setTimeout(() => {
      setIsConfettiActive(false);
    }, 4200);

    return () => clearTimeout(confettiTimeout);
  }, [isConfettiActive]);

  useEffect(() => {
    if (activeScreen !== "gameplay") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isShortcutInputTarget(event.target)
      ) {
        return;
      }

      const pressedKey = event.key.toLocaleLowerCase();
      if (pressedKey === "r" && canRoll) {
        event.preventDefault();
        handleRoll();
        return;
      }

      if (
        pressedKey === "b" &&
        canBank &&
        activePlayer &&
        !activePlayer.hasBankedThisRound
      ) {
        event.preventDefault();
        handleBankActivePlayer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePlayer, activeScreen, canBank, canRoll, handleRoll, handleBankActivePlayer]);

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

  function handleThemeChange(nextTheme: ThemePreference) {
    setSetupState((currentState) => ({
      ...currentState,
      theme: nextTheme
    }));
    setGameState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        settings: {
          ...currentState.settings,
          theme: nextTheme
        }
      };
    });

    writePersistedThemePreference(nextTheme);
  }

  function handleToggleAudioMuted() {
    setIsAudioMuted((currentMuted) => {
      const nextMuted = !currentMuted;
      writePersistedAudioMuted(nextMuted);
      announcePolite(nextMuted ? "Audio muted." : "Audio unmuted.");
      return nextMuted;
    });
  }

  function handleStartGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const setupConfig = buildSetupConfig(setupState);
    if (!setupConfig) {
      return;
    }

    resetDiceState();
    setIsSettingsOpen(false);
    setIsConfettiActive(false);
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
    setIsConfettiActive(false);
    setGameState(hydratedGameState);
    setResumeSnapshot(null);
  }

  function handleStartNewGame() {
    resetDiceState();
    setSetupState((currentState) => createSetupStateWithTheme(currentState.theme));
    setGameState(null);
    setResumeSnapshot(null);
    setIsSettingsOpen(false);
    setIsConfettiActive(false);
    clearPersistedGameSnapshot();
  }

  function handleResetSavedGame() {
    if (!hasSavedGame) {
      return;
    }

    if (!window.confirm("Reset saved game data? This cannot be undone.")) {
      return;
    }

    setResumeSnapshot(null);
    clearPersistedGameSnapshot();
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
    setIsConfettiActive(false);
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
      <ConfettiBurst isActive={isConfettiActive} />
      <div className={styles.visuallyHidden} aria-live="polite" aria-atomic="true">
        <span key={politeAnnouncement.id}>{politeAnnouncement.text}</span>
      </div>
      <div className={styles.visuallyHidden} aria-live="assertive" aria-atomic="true">
        <span key={assertiveAnnouncement.id}>{assertiveAnnouncement.text}</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Play bank game online with Bank Dice Game</h1>
          <button
            className={buildButtonClassNames(styles.button, styles.subtleButton)}
            type="button"
            onClick={handleToggleAudioMuted}
            aria-pressed={isAudioMuted}
          >
            {isAudioMuted ? "Unmute Audio" : "Mute Audio"}
          </button>
        </div>
        <p className={styles.subtitle}>
          Play bank game online in a fast multiplayer format: roll dice, grow the
          communal bank, and choose when to secure points before busts end a round.
        </p>
      </header>

      <div className={styles.stage}>
        <section
          className={styles.section}
          aria-labelledby="setup-heading"
          hidden={activeScreen !== "setup"}
        >
          <div className={styles.gameplayHeader}>
            <h2 id="setup-heading" className={styles.sectionHeading}>
              Setup
            </h2>
            <button
              className={buildButtonClassNames(styles.button, styles.subtleButton)}
              type="button"
              onClick={() => setIsSettingsOpen((currentValue) => !currentValue)}
              aria-expanded={isSettingsOpen}
              aria-controls="setup-settings-panel"
            >
              Settings
            </button>
          </div>

          <SettingsPanel
            context="setup"
            isOpen={isSettingsOpen}
            theme={setupState.theme}
            diceMode={setupState.diceMode}
            roundCountOption={setupState.roundCountOption}
            customRoundCount={setupState.customRoundCount}
            roundCountError={setupValidation.roundCountError}
            configuredRoundCount={setupRoundCount}
            onThemeChange={handleThemeChange}
            onDiceModeChange={(nextMode) =>
              setSetupState((currentState) => ({
                ...currentState,
                diceMode: nextMode
              }))
            }
            onRoundCountOptionChange={(nextOption) =>
              setSetupState((currentState) => ({
                ...currentState,
                roundCountOption: nextOption
              }))
            }
            onCustomRoundCountChange={(nextValue) =>
              setSetupState((currentState) => ({
                ...currentState,
                customRoundCount: nextValue
              }))
            }
            onResetSavedGame={hasSavedGame ? handleResetSavedGame : undefined}
          />

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

              <div className={styles.actionRow}>
                <button
                  className={buildButtonClassNames(styles.button, styles.primaryButton)}
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
              onRoll={handleRoll}
              onManualDieInputChange={handleManualDieInputChange}
              onBankActivePlayer={handleBankActivePlayer}
              onBankPlayer={handleBankPlayer}
              onAdvanceTurn={handleAdvanceTurn}
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
                  : `Winner: ${winnerNames[0] ?? "No winner"}`}
              </p>
              <p className={styles.sectionCopy}>
                All {gameState.settings.roundCount} rounds are complete.
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
            <button
              className={buildButtonClassNames(styles.button, styles.primaryButton)}
              type="button"
              onClick={handlePlayAgain}
            >
              Play Again
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
