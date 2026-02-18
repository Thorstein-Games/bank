import type { GameScreen, ThemePreference } from "@/game/models";
import styles from "../AppShell.module.css";
import SettingsPanel from "../SettingsPanel";

interface AppShellSettingsModalProps {
  isOpen: boolean;
  activeScreen: GameScreen;
  isAudioMuted: boolean;
  activeTheme: ThemePreference;
  hasSavedGame: boolean;
  onClose: () => void;
  onThemeChange: (theme: ThemePreference) => void;
  onToggleAudioMuted: () => void;
  onResetSavedGame: () => void;
}

export default function AppShellSettingsModal({
  isOpen,
  activeScreen,
  isAudioMuted,
  activeTheme,
  hasSavedGame,
  onClose,
  onThemeChange,
  onToggleAudioMuted,
  onResetSavedGame,
}: AppShellSettingsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.settingsModalBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
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
          onClick={onClose}
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
          onThemeChange={onThemeChange}
          onToggleAudioMuted={onToggleAudioMuted}
          onResetSavedGame={hasSavedGame ? onResetSavedGame : undefined}
        />
      </div>
    </div>
  );
}
