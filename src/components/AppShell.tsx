"use client";

import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROUND_COUNT_PRESETS,
} from "@/game/constants";
import type {
  DiceMode,
  GameScreen,
  GameState,
  ThemePreference,
} from "@/game/models";
import { type GameAction, gameReducer } from "@/game/reducer";
import useDiceRollController, {
  type RollResolutionFeedback,
} from "@/hooks/useDiceRollController";
import useGameAudio from "@/hooks/useGameAudio";
import {
  CUSTOM_ROUND_COUNT,
  buildSetupConfig,
  createDefaultSetupState,
  createInitialGameState,
  resizePlayerNames,
  type RoundCountOption,
  type SetupState,
  validateSetup,
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
  writePersistedThemePreference,
} from "@/state/persistence";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./AppShell.module.css";
import ConfettiBurst from "./ConfettiBurst";
import GameplayPanel from "./GameplayPanel";
import SettingsPanel from "./SettingsPanel";
import SettingsIconButton from "./SettingsIconButton";

const PLAYER_COUNT_OPTIONS = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, index) => MIN_PLAYERS + index,
);
const AUTO_ADVANCE_DELAY_MS = 300;

interface LiveAnnouncement {
  id: number;
  text: string;
}

function createSetupStateWithTheme(theme: ThemePreference) {
  return {
    ...createDefaultSetupState(),
    theme,
  };
}

function getWinnerNames(gameState: GameState): string[] {
  return gameState.status.winnerIds
    .map(
      (winnerId) =>
        gameState.players.find((player) => player.id === winnerId)?.name,
    )
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

function buildSetupStateFromCompletedGame(gameState: GameState): SetupState {
  const presetRoundCount = ROUND_COUNT_PRESETS.find(
    (preset) => preset === gameState.settings.roundCount,
  );
  const roundCountOption: SetupState["roundCountOption"] =
    presetRoundCount ?? CUSTOM_ROUND_COUNT;

  return {
    playerNames: gameState.players.map((player) => player.name),
    roundCountOption,
    customRoundCount: presetRoundCount
      ? ""
      : String(gameState.settings.roundCount),
    diceMode: gameState.settings.diceMode,
    theme: gameState.settings.theme,
  };
}

export default function AppShell() {
  const [setupState, setSetupState] = useState(createDefaultSetupState);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [resumeSnapshot, setResumeSnapshot] =
    useState<PersistedGameSnapshot | null>(null);
  const [hasLoadedSavedGame, setHasLoadedSavedGame] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [politeAnnouncement, setPoliteAnnouncement] =
    useState<LiveAnnouncement>({
      id: 0,
      text: "",
    });
  const [assertiveAnnouncement, setAssertiveAnnouncement] =
    useState<LiveAnnouncement>({
      id: 0,
      text: "",
    });
  const [isConfettiActive, setIsConfettiActive] = useState(false);
  const previousScreenRef = useRef<GameScreen>("setup");

  const announcePolite = useCallback((text: string) => {
    setPoliteAnnouncement((currentAnnouncement) => ({
      id: currentAnnouncement.id + 1,
      text,
    }));
  }, []);

  const announceAssertive = useCallback((text: string) => {
    setAssertiveAnnouncement((currentAnnouncement) => ({
      id: currentAnnouncement.id + 1,
      text,
    }));
  }, []);

  const setupValidation = useMemo(
    () => validateSetup(setupState),
    [setupState],
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
    hasUserInteracted,
  });

  const handleRollResolved = useCallback(
    (rollResult: RollResolutionFeedback) => {
      if (!gameState) {
        return;
      }

      const activePlayerName =
        gameState.players[gameState.turn.activePlayerIndex]?.name ??
        "Active player";

      if (rollResult.isBust) {
        announceAssertive(
          `Bust. ${activePlayerName} rolled ${rollResult.dieOne} and ${rollResult.dieTwo}. The round ended immediately.`,
        );
        return;
      }

      const bonusText = rollResult.total === 7 ? " Early 7 bonus applied." : "";
      announcePolite(
        `${activePlayerName} rolled ${rollResult.dieOne} and ${rollResult.dieTwo} for ${rollResult.total}. Communal bank is ${rollResult.nextBankTotal}.${bonusText}`,
      );
    },
    [announceAssertive, announcePolite, gameState],
  );

  const {
    diceOne,
    diceTwo,
    isDiceAnimating,
    pendingRoll,
    isManualMode,
    isManualOutcomeSelected,
    diceInputError,
    selectedOutcome,
    resetDiceState,
    setStableDiceDisplay,
    handleRoll,
    handleManualOutcomeSelect,
  } = useDiceRollController({
    gameState,
    dispatchGameAction,
    onBuiltInRollStart: playRollSound,
    onRollResolved: handleRollResolved,
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
        theme: persistedThemePreference,
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

  const activeScreen: GameScreen = gameState
    ? gameState.status.screen
    : "setup";
  const showResumePrompt =
    hasLoadedSavedGame && gameState === null && resumeSnapshot !== null;
  const activePlayer = gameState
    ? (gameState.players[gameState.turn.activePlayerIndex] ?? null)
    : null;
  const canRoll = Boolean(
    gameState &&
    activePlayer &&
    !gameState.turn.hasRolledThisTurn &&
    !activePlayer.hasBankedThisRound &&
    !isDiceAnimating &&
    (!isManualMode || isManualOutcomeSelected),
  );
  const canBank = Boolean(
    gameState && gameState.round.bankTotal > 0 && !isDiceAnimating,
  );
  const shouldAutoAdvanceTurn = Boolean(
    activeScreen === "gameplay" &&
    gameState?.turn.hasRolledThisTurn &&
    !isDiceAnimating,
  );
  const winnerIdSet = useMemo(
    () => new Set(gameState?.status.winnerIds ?? []),
    [gameState],
  );
  const winnerNames = useMemo(
    () => (gameState ? getWinnerNames(gameState) : []),
    [gameState],
  );
  const finalStandings = useMemo(() => {
    if (!gameState) {
      return [];
    }

    return [...gameState.players].sort((leftPlayer, rightPlayer) => {
      if (leftPlayer.score !== rightPlayer.score) {
        return rightPlayer.score - leftPlayer.score;
      }

      return leftPlayer.name.localeCompare(rightPlayer.name);
    });
  }, [gameState]);
  const winningScore = finalStandings[0]?.score ?? 0;
  const winnerSummary =
    winnerNames.length === 0
      ? "No winner was recorded for this game."
      : winnerNames.length === 1
        ? `${winnerNames[0]} takes the game with ${winningScore} points.`
        : `${winnerNames.join(" and ")} tie for first at ${winningScore} points.`;
  const handleBankPlayer = useCallback(
    (playerId: string) => {
      if (!gameState || gameState.round.bankTotal < 1 || isDiceAnimating) {
        return;
      }

      const player = gameState.players.find(
        (candidatePlayer) => candidatePlayer.id === playerId,
      );
      if (!player || player.hasBankedThisRound) {
        return;
      }

      const bankedAmount = gameState.round.bankTotal;
      const nextScore = player.score + bankedAmount;

      dispatchGameAction({
        type: "bank-player",
        playerId,
      });
      playBankSound();
      announcePolite(
        `${player.name} banked ${bankedAmount}. New score: ${nextScore}.`,
      );
    },
    [
      announcePolite,
      dispatchGameAction,
      gameState,
      isDiceAnimating,
      playBankSound,
    ],
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
      pendingRoll,
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
    if (!shouldAutoAdvanceTurn) {
      return;
    }

    const autoAdvanceTimeout = setTimeout(() => {
      dispatchGameAction({
        type: "advance-turn",
      });
    }, AUTO_ADVANCE_DELAY_MS);

    return () => clearTimeout(autoAdvanceTimeout);
  }, [dispatchGameAction, shouldAutoAdvanceTurn]);

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
  }, [
    activePlayer,
    activeScreen,
    canBank,
    canRoll,
    handleRoll,
    handleBankActivePlayer,
  ]);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [isSettingsOpen]);

  function handlePlayerCountChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextCount = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(nextCount)) {
      return;
    }

    setSetupState((currentState) => ({
      ...currentState,
      playerNames: resizePlayerNames(currentState.playerNames, nextCount),
    }));
  }

  function handlePlayerNameChange(index: number, nextValue: string) {
    setSetupState((currentState) => {
      const nextPlayerNames = [...currentState.playerNames];
      nextPlayerNames[index] = nextValue;
      return {
        ...currentState,
        playerNames: nextPlayerNames,
      };
    });
  }

  function handleDiceModeChange(nextMode: DiceMode) {
    setSetupState((currentState) => ({
      ...currentState,
      diceMode: nextMode,
    }));
  }

  function handleRoundCountOptionChange(nextOption: RoundCountOption) {
    setSetupState((currentState) => ({
      ...currentState,
      roundCountOption: nextOption,
    }));
  }

  function handleCustomRoundCountChange(nextValue: string) {
    setSetupState((currentState) => ({
      ...currentState,
      customRoundCount: nextValue,
    }));
  }

  function handleThemeChange(nextTheme: ThemePreference) {
    setSetupState((currentState) => ({
      ...currentState,
      theme: nextTheme,
    }));
    setGameState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        settings: {
          ...currentState.settings,
          theme: nextTheme,
        },
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
        dieTwo: resumeSnapshot.pendingRoll.dieTwo,
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
    setSetupState((currentState) =>
      createSetupStateWithTheme(currentState.theme),
    );
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
        theme: gameState.settings.theme,
      }),
    );
  }

  function handleEditNextGameSettings() {
    if (!gameState) {
      return;
    }

    resetDiceState();
    setSetupState(buildSetupStateFromCompletedGame(gameState));
    setGameState(null);
    setResumeSnapshot(null);
    setIsSettingsOpen(false);
    setIsConfettiActive(false);
    clearPersistedGameSnapshot();
  }

  return (
    <main className={styles.page}>
      <ConfettiBurst isActive={isConfettiActive} />
      <div
        className={styles.visuallyHidden}
        aria-live="polite"
        aria-atomic="true"
      >
        <span key={politeAnnouncement.id}>{politeAnnouncement.text}</span>
      </div>
      <div
        className={styles.visuallyHidden}
        aria-live="assertive"
        aria-atomic="true"
      >
        <span key={assertiveAnnouncement.id}>{assertiveAnnouncement.text}</span>
      </div>
      {activeScreen === "setup" && (
        <header className={styles.header}>
          <>
            <div className={styles.headerRow}>
              <h1 className={styles.title}>Play Bank Dice Game Online</h1>
            </div>
            <p className={styles.subtitle}>
              Play Bank Dice Game Online in a fast multiplayer format: roll
              dice, grow the communal bank, and choose when to secure points
              before busts end a round.
            </p>
          </>
        </header>
      )}

      <div className={styles.stage}>
        <section
          aria-labelledby="setup-heading"
          hidden={activeScreen !== "setup"}
        >
          <div className={styles.gameplayHeader}>
            <h2 id="setup-heading" className={styles.sectionHeading}>
              Setup
            </h2>
            <SettingsIconButton
              isOpen={isSettingsOpen}
              onClick={() => setIsSettingsOpen(true)}
            />
          </div>

          {showResumePrompt ? (
            <div
              className={styles.resumePrompt}
              role="dialog"
              aria-modal="false"
            >
              <p className={styles.sectionCopy}>
                Saved game found. Resume where you left off or start a new game.
              </p>
              <div className={styles.actionRow}>
                <button
                  className={styles.button}
                  type="button"
                  onClick={handleResumeGame}
                >
                  Resume Game
                </button>
                <button
                  className={styles.button}
                  type="button"
                  onClick={handleStartNewGame}
                >
                  New Game
                </button>
              </div>
            </div>
          ) : (
            <form
              className={styles.setupForm}
              onSubmit={handleStartGame}
              noValidate
            >
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
                      <label
                        key={fieldId}
                        className={styles.playerField}
                        htmlFor={fieldId}
                      >
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
                          <span
                            id={errorId}
                            className={styles.errorText}
                            role="alert"
                          >
                            {playerError}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Dice mode</legend>
                <div className={styles.radioRow}>
                  <label className={styles.optionLabel}>
                    <input
                      type="radio"
                      name="setup-dice-mode"
                      value="built-in"
                      checked={setupState.diceMode === "built-in"}
                      onChange={() => handleDiceModeChange("built-in")}
                    />
                    <span>Built-in</span>
                  </label>
                  <label className={styles.optionLabel}>
                    <input
                      type="radio"
                      name="setup-dice-mode"
                      value="manual"
                      checked={setupState.diceMode === "manual"}
                      onChange={() => handleDiceModeChange("manual")}
                    />
                    <span>Manual input</span>
                  </label>
                </div>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Rounds</legend>
                <div className={styles.radioRow}>
                  {ROUND_COUNT_PRESETS.map((preset) => (
                    <label key={preset} className={styles.optionLabel}>
                      <input
                        type="radio"
                        name="setup-round-count"
                        value={preset}
                        checked={setupState.roundCountOption === preset}
                        onChange={() => handleRoundCountOptionChange(preset)}
                      />
                      <span>{preset} rounds</span>
                    </label>
                  ))}
                  <label className={styles.optionLabel}>
                    <input
                      type="radio"
                      name="setup-round-count"
                      value={CUSTOM_ROUND_COUNT}
                      checked={
                        setupState.roundCountOption === CUSTOM_ROUND_COUNT
                      }
                      onChange={() =>
                        handleRoundCountOptionChange(CUSTOM_ROUND_COUNT)
                      }
                    />
                    <span>Custom</span>
                  </label>
                </div>
                <label
                  className={styles.label}
                  htmlFor="setup-custom-round-count"
                >
                  Custom round count
                </label>
                <input
                  id="setup-custom-round-count"
                  className={styles.input}
                  type="number"
                  min={1}
                  step={1}
                  value={setupState.customRoundCount}
                  disabled={setupState.roundCountOption !== CUSTOM_ROUND_COUNT}
                  onChange={(event) =>
                    handleCustomRoundCountChange(event.target.value)
                  }
                  aria-invalid={Boolean(setupValidation.roundCountError)}
                  aria-describedby={
                    setupValidation.roundCountError
                      ? "setup-custom-round-count-error"
                      : undefined
                  }
                />
                {setupValidation.roundCountError && (
                  <p
                    id="setup-custom-round-count-error"
                    className={styles.errorText}
                    role="alert"
                  >
                    {setupValidation.roundCountError}
                  </p>
                )}
              </fieldset>

              <div className={styles.actionRow}>
                <button
                  className={buildButtonClassNames(
                    styles.button,
                    styles.primaryButton,
                  )}
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
              selectedOutcome={selectedOutcome}
              onRoll={handleRoll}
              onManualOutcomeSelect={handleManualOutcomeSelect}
              onBankPlayer={handleBankPlayer}
              onOpenSettings={() => setIsSettingsOpen(true)}
              isSettingsOpen={isSettingsOpen}
            />
          )}
        </section>

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
              {gameState && <p className={styles.endSummary}>{winnerSummary}</p>}
            </div>
            {gameState && (
              <ol
                className={styles.endScoreboard}
                aria-label="Final scoreboard"
              >
                {finalStandings.map((player, index) => {
                  const isWinner = winnerIdSet.has(player.id);

                  return (
                    <li
                      key={player.id}
                      className={buildButtonClassNames(
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
                      <p className={styles.endScoreLabel}>Final score</p>
                      <p className={styles.endPlayerScore}>{player.score}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <div className={buildButtonClassNames(styles.actionRow, styles.endActionRow)}>
            <button
              className={buildButtonClassNames(
                styles.button,
                styles.primaryButton,
              )}
              type="button"
              onClick={handlePlayAgain}
            >
              Play Again
            </button>
            <button
              className={buildButtonClassNames(
                styles.button,
                styles.secondaryButton,
              )}
              type="button"
              onClick={handleEditNextGameSettings}
            >
              Change Settings for Next Game
            </button>
          </div>
        </section>
      </div>

      {isSettingsOpen && (
        <div
          className={styles.settingsModalBackdrop}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsSettingsOpen(false);
            }
          }}
        >
          <div
            id="settings-modal"
            className={styles.settingsModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-heading"
          >
            <button
              className={styles.settingsModalCloseButton}
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              aria-label="Close settings"
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <SettingsPanel
              context={activeScreen === "setup" ? "setup" : "gameplay"}
              isOpen
              headingId="settings-modal-heading"
              isAudioMuted={isAudioMuted}
              theme={activeTheme}
              onThemeChange={handleThemeChange}
              onToggleAudioMuted={handleToggleAudioMuted}
              onResetSavedGame={hasSavedGame ? handleResetSavedGame : undefined}
            />
          </div>
        </div>
      )}
    </main>
  );
}
