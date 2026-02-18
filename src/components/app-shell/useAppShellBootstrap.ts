import type { ThemePreference } from "@/game/models";
import type { SetupState } from "@/state";
import {
  readPersistedAudioMuted,
  readPersistedGameSnapshot,
  readPersistedThemePreference,
  type PersistedGameSnapshot,
} from "@/state/persistence";
import { useEffect } from "react";

interface UseAppShellBootstrapArgs {
  activeTheme: ThemePreference;
  setHasUserInteracted: (value: boolean) => void;
  setSetupState: (updater: (state: SetupState) => SetupState) => void;
  setIsAudioMuted: (value: boolean) => void;
  setResumeSnapshot: (snapshot: PersistedGameSnapshot | null) => void;
  setHasLoadedSavedGame: (value: boolean) => void;
}

export default function useAppShellBootstrap({
  activeTheme,
  setHasUserInteracted,
  setSetupState,
  setIsAudioMuted,
  setResumeSnapshot,
  setHasLoadedSavedGame,
}: UseAppShellBootstrapArgs) {
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
  }, [setHasUserInteracted]);

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
  }, [setHasLoadedSavedGame, setIsAudioMuted, setResumeSnapshot, setSetupState]);

  useEffect(() => {
    const rootElement = document.documentElement;
    if (activeTheme === "system") {
      rootElement.removeAttribute("data-theme");
      return;
    }

    rootElement.setAttribute("data-theme", activeTheme);
  }, [activeTheme]);
}
