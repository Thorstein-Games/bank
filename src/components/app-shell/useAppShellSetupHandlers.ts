import type { DiceMode, GameState, ThemePreference } from "@/game/models";
import { resizePlayerNames, type RoundCountOption, type SetupState } from "@/state";
import {
  writePersistedAudioMuted,
  writePersistedThemePreference,
} from "@/state/persistence";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";

interface UseAppShellSetupHandlersArgs {
  setSetupState: Dispatch<SetStateAction<SetupState>>;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
  setIsAudioMuted: Dispatch<SetStateAction<boolean>>;
  announcePolite: (text: string) => void;
}

export default function useAppShellSetupHandlers({
  setSetupState,
  setGameState,
  setIsAudioMuted,
  announcePolite,
}: UseAppShellSetupHandlersArgs) {
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

  return {
    handlePlayerCountChange,
    handlePlayerNameChange,
    handleDiceModeChange,
    handleRoundCountOptionChange,
    handleCustomRoundCountChange,
    handleThemeChange,
    handleToggleAudioMuted,
  };
}
