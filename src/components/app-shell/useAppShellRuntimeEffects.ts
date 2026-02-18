import type { DiceValues } from "@/game/dice";
import type { GameScreen, GameState, Player } from "@/game/models";
import {
  GAME_SAVE_SCHEMA_VERSION,
  clearPersistedGameSnapshot,
  writePersistedGameSnapshot,
} from "@/state/persistence";
import { useEffect, type MutableRefObject } from "react";
import { buildWinnerAnnouncement, getWinnerNames, isShortcutInputTarget } from "./appShellUtils";

interface UseAppShellRuntimeEffectsArgs {
  hasLoadedSavedGame: boolean;
  showResumePrompt: boolean;
  gameState: GameState | null;
  pendingRoll: DiceValues | null;
  previousScreenRef: MutableRefObject<GameScreen>;
  announceAssertive: (text: string) => void;
  isConfettiActive: boolean;
  setIsConfettiActive: (value: boolean) => void;
  shouldAutoAdvanceTurn: boolean;
  autoAdvanceDelayMs: number;
  dispatchGameAction: (action: { type: "advance-turn" }) => void;
  activeScreen: GameScreen;
  canRoll: boolean;
  canBank: boolean;
  activePlayer: Player | null;
  handleRoll: () => void;
  handleBankActivePlayer: () => void;
  isSettingsOpen: boolean;
  isRollHistoryOpen: boolean;
  closeModals: () => void;
}

export default function useAppShellRuntimeEffects({
  hasLoadedSavedGame,
  showResumePrompt,
  gameState,
  pendingRoll,
  previousScreenRef,
  announceAssertive,
  isConfettiActive,
  setIsConfettiActive,
  shouldAutoAdvanceTurn,
  autoAdvanceDelayMs,
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
}: UseAppShellRuntimeEffectsArgs) {
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
  }, [gameState, hasLoadedSavedGame, pendingRoll, showResumePrompt]);

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
  }, [announceAssertive, gameState, previousScreenRef, setIsConfettiActive]);

  useEffect(() => {
    if (!isConfettiActive) {
      return;
    }

    const confettiTimeout = setTimeout(() => {
      setIsConfettiActive(false);
    }, 4200);

    return () => clearTimeout(confettiTimeout);
  }, [isConfettiActive, setIsConfettiActive]);

  useEffect(() => {
    if (!shouldAutoAdvanceTurn) {
      return;
    }

    const autoAdvanceTimeout = setTimeout(() => {
      dispatchGameAction({
        type: "advance-turn",
      });
    }, autoAdvanceDelayMs);

    return () => clearTimeout(autoAdvanceTimeout);
  }, [autoAdvanceDelayMs, dispatchGameAction, shouldAutoAdvanceTurn]);

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
    handleBankActivePlayer,
    handleRoll,
  ]);

  useEffect(() => {
    if (!isSettingsOpen && !isRollHistoryOpen) {
      return;
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModals();
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [closeModals, isRollHistoryOpen, isSettingsOpen]);
}
