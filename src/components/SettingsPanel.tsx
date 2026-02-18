import { GAME_RULE_SECTIONS } from "@/game/rules";
import type { ThemePreference } from "@/game/models";
import styles from "./AppShell.module.css";

interface SettingsPanelProps {
  context: "setup" | "gameplay";
  isOpen: boolean;
  headingId?: string;
  isAudioMuted: boolean;
  theme: ThemePreference;
  onThemeChange: (nextTheme: ThemePreference) => void;
  onToggleAudioMuted: () => void;
  onResetSavedGame?: () => void;
}

export default function SettingsPanel({
  context,
  isOpen,
  headingId,
  isAudioMuted,
  theme,
  onThemeChange,
  onToggleAudioMuted,
  onResetSavedGame,
}: SettingsPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside id={`${context}-settings-panel`} className={styles.settingsPanel}>
      <h3 id={headingId} className={styles.sectionHeading}>
        Settings
      </h3>

      <div className={styles.settingsActionRow}>
        <button
          className={styles.button}
          type="button"
          onClick={onToggleAudioMuted}
        >
          {isAudioMuted ? "Unmute Audio" : "Mute Audio"}
        </button>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Theme</legend>
        <div className={styles.radioRow}>
          <label className={styles.optionLabel}>
            <input
              type="radio"
              name={`${context}-theme`}
              value="system"
              checked={theme === "system"}
              onChange={() => onThemeChange("system")}
            />
            <span>System</span>
          </label>
          <label className={styles.optionLabel}>
            <input
              type="radio"
              name={`${context}-theme`}
              value="light"
              checked={theme === "light"}
              onChange={() => onThemeChange("light")}
            />
            <span>Light</span>
          </label>
          <label className={styles.optionLabel}>
            <input
              type="radio"
              name={`${context}-theme`}
              value="dark"
              checked={theme === "dark"}
              onChange={() => onThemeChange("dark")}
            />
            <span>Dark</span>
          </label>
        </div>
      </fieldset>

      {onResetSavedGame && (
        <div className={styles.settingsActionRow}>
          <button
            className={styles.button}
            type="button"
            onClick={onResetSavedGame}
          >
            Reset Saved Game
          </button>
        </div>
      )}

      <details className={styles.rulesDetails} data-testid={`${context}-rules`}>
        <summary className={styles.rulesSummary}>Rules</summary>
        <div className={styles.rulesContent}>
          {GAME_RULE_SECTIONS.map((section) => (
            <section key={section.title} className={styles.rulesSection}>
              <h4 className={styles.rulesSectionTitle}>{section.title}</h4>
              <ul className={styles.rulesList}>
                {section.points.map((point) => (
                  <li key={`${section.title}-${point}`}>{point}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </details>
    </aside>
  );
}
