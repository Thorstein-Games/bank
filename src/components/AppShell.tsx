"use client";

import { EARLY_TURN_WINDOW } from "@/game/constants";
import type { GameScreen, GameState } from "@/game/models";
import { type GameAction, gameReducer } from "@/game/reducer";
import useDiceRollController, {
  type RollResolutionFeedback,
} from "@/hooks/useDiceRollController";
import useGameAudio from "@/hooks/useGameAudio";
import {
  buildSetupConfig,
  createDefaultSetupState,
  createInitialGameState,
  validateSetup,
} from "@/state";
import {
  clearPersistedGameSnapshot,
  type PersistedGameSnapshot,
} from "@/state/persistence";
import type { FormEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import styles from "./AppShell.module.css";
import ConfettiBurst from "./ConfettiBurst";
import GameplayPanel from "./GameplayPanel";
import AppShellAnnouncements from "./app-shell/AppShellAnnouncements";
import AppShellEndGameScreen from "./app-shell/AppShellEndGameScreen";
import AppShellRollHistoryModal from "./app-shell/AppShellRollHistoryModal";
import AppShellSettingsModal from "./app-shell/AppShellSettingsModal";
import AppShellSetupScreen from "./app-shell/AppShellSetupScreen";
import {
  buildFinalStandings,
  buildRoundHistoryStats,
  buildSetupStateFromCompletedGame,
  buildWinnerSummary,
  createSetupStateWithTheme,
  getWinnerNames,
  type LiveAnnouncement,
} from "./app-shell/appShellUtils";
import useAppShellBootstrap from "./app-shell/useAppShellBootstrap";
import useAppShellRuntimeEffects from "./app-shell/useAppShellRuntimeEffects";
import useAppShellSetupHandlers from "./app-shell/useAppShellSetupHandlers";

const AUTO_ADVANCE_DELAY_MS = 300;

export default function AppShell() {
  const [setupState, setSetupState] = useState(createDefaultSetupState);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [resumeSnapshot, setResumeSnapshot] =
    useState<PersistedGameSnapshot | null>(null);
  const [hasLoadedSavedGame, setHasLoadedSavedGame] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRollHistoryOpen, setIsRollHistoryOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [politeAnnouncement, setPoliteAnnouncement] = useState<LiveAnnouncement>({
    id: 0,
    text: "",
  });
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState<LiveAnnouncement>({
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

  const setupValidation = useMemo(() => validateSetup(setupState), [setupState]);
  const activeTheme = gameState?.settings.theme ?? setupState.theme;
  const hasSavedGame = Boolean(gameState || resumeSnapshot);

  useAppShellBootstrap({
    activeTheme,
    setHasUserInteracted,
    setSetupState,
    setIsAudioMuted,
    setResumeSnapshot,
    setHasLoadedSavedGame,
  });

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

  const activeScreen: GameScreen = gameState ? gameState.status.screen : "setup";
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
    gameState &&
      gameState.round.turnCountInRound >= EARLY_TURN_WINDOW &&
      gameState.round.bankTotal > 0 &&
      !isDiceAnimating,
  );
  const shouldAutoAdvanceTurn = Boolean(
    activeScreen === "gameplay" &&
      gameState?.turn.hasRolledThisTurn &&
      !isDiceAnimating,
  );

  const winnerNames = useMemo(
    () => (gameState ? getWinnerNames(gameState) : []),
    [gameState],
  );
  const winnerIdSet = useMemo(
    () => new Set(gameState?.status.winnerIds ?? []),
    [gameState],
  );
  const finalStandings = useMemo(
    () => (gameState ? buildFinalStandings(gameState) : []),
    [gameState],
  );
  const winningScore = finalStandings[0]?.score ?? 0;
  const winnerSummary = useMemo(
    () => buildWinnerSummary(winnerNames, winningScore),
    [winnerNames, winningScore],
  );

  const playerNameById = useMemo(() => {
    if (!gameState) {
      return new Map<string, string>();
    }

    return new Map(gameState.players.map((player) => [player.id, player.name]));
  }, [gameState]);
  const rollHistoryRounds = useMemo(() => gameState?.rollHistory ?? [], [gameState]);
  const hasRollHistory = useMemo(
    () => rollHistoryRounds.some((round) => round.entries.length > 0),
    [rollHistoryRounds],
  );
  const roundHistoryStats = useMemo(
    () => buildRoundHistoryStats(rollHistoryRounds),
    [rollHistoryRounds],
  );

  const handleBankPlayer = useCallback(
    (playerId: string) => {
      if (
        !gameState ||
        gameState.round.turnCountInRound < EARLY_TURN_WINDOW ||
        gameState.round.bankTotal < 1 ||
        isDiceAnimating
      ) {
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

  const closeModals = useCallback(() => {
    setIsSettingsOpen(false);
    setIsRollHistoryOpen(false);
  }, []);

  const {
    handlePlayerCountChange,
    handlePlayerNameChange,
    handleDiceModeChange,
    handleRoundCountOptionChange,
    handleCustomRoundCountChange,
    handleThemeChange,
    handleToggleAudioMuted,
  } = useAppShellSetupHandlers({
    setSetupState,
    setGameState,
    setIsAudioMuted,
    announcePolite,
  });

  useAppShellRuntimeEffects({
    hasLoadedSavedGame,
    showResumePrompt,
    gameState,
    pendingRoll,
    previousScreenRef,
    announceAssertive,
    isConfettiActive,
    setIsConfettiActive,
    shouldAutoAdvanceTurn,
    autoAdvanceDelayMs: AUTO_ADVANCE_DELAY_MS,
    dispatchGameAction,
    activeScreen,
    canRoll,
    canBank,
    activePlayer,
    handleRoll,
    handleBankActivePlayer,
    isSettingsOpen,
    isRollHistoryOpen,
    closeModals,
  });

  function handleStartGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const setupConfig = buildSetupConfig(setupState);
    if (!setupConfig) {
      return;
    }

    resetDiceState();
    closeModals();
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

    closeModals();
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
    closeModals();
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
    closeModals();
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
    closeModals();
    setIsConfettiActive(false);
    clearPersistedGameSnapshot();
  }

  const openSettings = useCallback(() => {
    setIsRollHistoryOpen(false);
    setIsSettingsOpen(true);
  }, []);

  const openRollHistory = useCallback(() => {
    setIsSettingsOpen(false);
    setIsRollHistoryOpen(true);
  }, []);

  return (
    <main className={styles.page}>
      <ConfettiBurst isActive={isConfettiActive} />
      <AppShellAnnouncements
        politeAnnouncement={politeAnnouncement}
        assertiveAnnouncement={assertiveAnnouncement}
      />

      <div className={styles.stage}>
        <AppShellSetupScreen
          activeScreen={activeScreen}
          isSettingsOpen={isSettingsOpen}
          showResumePrompt={showResumePrompt}
          setupState={setupState}
          setupValidation={setupValidation}
          onOpenSettings={openSettings}
          onResumeGame={handleResumeGame}
          onStartNewGame={handleStartNewGame}
          onStartGame={handleStartGame}
          onPlayerCountChange={handlePlayerCountChange}
          onPlayerNameChange={handlePlayerNameChange}
          onDiceModeChange={handleDiceModeChange}
          onRoundCountOptionChange={handleRoundCountOptionChange}
          onCustomRoundCountChange={handleCustomRoundCountChange}
        />

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
              onOpenSettings={openSettings}
              onOpenRollHistory={openRollHistory}
              isSettingsOpen={isSettingsOpen}
            />
          )}
        </section>

        {activeScreen === "end-of-game" && (
          <AppShellEndGameScreen
            activeScreen={activeScreen}
            finalStandings={finalStandings}
            winnerIdSet={winnerIdSet}
            winnerSummary={winnerSummary}
            onOpenRollHistory={openRollHistory}
            onPlayAgain={handlePlayAgain}
            onEditNextGameSettings={handleEditNextGameSettings}
          />
        )}
      </div>

      <AppShellSettingsModal
        isOpen={isSettingsOpen}
        activeScreen={activeScreen}
        isAudioMuted={isAudioMuted}
        activeTheme={activeTheme}
        hasSavedGame={hasSavedGame}
        onClose={() => setIsSettingsOpen(false)}
        onThemeChange={handleThemeChange}
        onToggleAudioMuted={handleToggleAudioMuted}
        onResetSavedGame={handleResetSavedGame}
      />
      <AppShellRollHistoryModal
        isOpen={isRollHistoryOpen}
        gameState={gameState}
        hasRollHistory={hasRollHistory}
        roundHistoryStats={roundHistoryStats}
        playerNameById={playerNameById}
        onClose={() => setIsRollHistoryOpen(false)}
      />
    </main>
  );
}
