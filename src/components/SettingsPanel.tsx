import { ROUND_COUNT_PRESETS } from "@/game/constants";
import { GAME_RULE_SECTIONS } from "@/game/rules";
import type { DiceMode, ThemePreference } from "@/game/models";
import { CUSTOM_ROUND_COUNT, type RoundCountOption } from "@/state";
import styles from "./AppShell.module.css";

interface SettingsPanelProps {
  context: "setup" | "gameplay";
  isOpen: boolean;
  theme: ThemePreference;
  diceMode: DiceMode;
  roundCountOption: RoundCountOption;
  customRoundCount: string;
  roundCountError: string | null;
  configuredRoundCount: number;
  onThemeChange: (nextTheme: ThemePreference) => void;
  onDiceModeChange?: (nextMode: DiceMode) => void;
  onRoundCountOptionChange?: (nextOption: RoundCountOption) => void;
  onCustomRoundCountChange?: (nextValue: string) => void;
  onResetSavedGame?: () => void;
}

export default function SettingsPanel({
  context,
  isOpen,
  theme,
  diceMode,
  roundCountOption,
  customRoundCount,
  roundCountError,
  configuredRoundCount,
  onThemeChange,
  onDiceModeChange,
  onRoundCountOptionChange,
  onCustomRoundCountChange,
  onResetSavedGame
}: SettingsPanelProps) {
  if (!isOpen) {
    return null;
  }

  const isSetupContext = context === "setup";
  const isGameplayContext = !isSetupContext;

  return (
    <aside id={`${context}-settings-panel`} className={styles.settingsPanel}>
      <h3 className={styles.sectionHeading}>Settings</h3>

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

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Dice mode</legend>
        {isSetupContext ? (
          <div className={styles.radioRow}>
            <label className={styles.optionLabel}>
              <input
                type="radio"
                name={`${context}-dice-mode`}
                value="built-in"
                checked={diceMode === "built-in"}
                onChange={() => onDiceModeChange?.("built-in")}
              />
              <span>Built-in</span>
            </label>
            <label className={styles.optionLabel}>
              <input
                type="radio"
                name={`${context}-dice-mode`}
                value="manual"
                checked={diceMode === "manual"}
                onChange={() => onDiceModeChange?.("manual")}
              />
              <span>Manual input</span>
            </label>
          </div>
        ) : (
          <p className={styles.sectionCopy}>
            Dice mode is locked for this game: <strong>{diceMode}</strong>.
          </p>
        )}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Rounds</legend>
        {isSetupContext ? (
          <>
            <div className={styles.radioRow}>
              {ROUND_COUNT_PRESETS.map((preset) => (
                <label key={preset} className={styles.optionLabel}>
                  <input
                    type="radio"
                    name={`${context}-round-count`}
                    value={preset}
                    checked={roundCountOption === preset}
                    onChange={() => onRoundCountOptionChange?.(preset)}
                  />
                  <span>{preset} rounds</span>
                </label>
              ))}
              <label className={styles.optionLabel}>
                <input
                  type="radio"
                  name={`${context}-round-count`}
                  value={CUSTOM_ROUND_COUNT}
                  checked={roundCountOption === CUSTOM_ROUND_COUNT}
                  onChange={() => onRoundCountOptionChange?.(CUSTOM_ROUND_COUNT)}
                />
                <span>Custom</span>
              </label>
            </div>
            <label className={styles.label} htmlFor={`${context}-custom-round-count`}>
              Custom round count
            </label>
            <input
              id={`${context}-custom-round-count`}
              className={styles.input}
              type="number"
              min={1}
              step={1}
              value={customRoundCount}
              disabled={roundCountOption !== CUSTOM_ROUND_COUNT}
              onChange={(event) => onCustomRoundCountChange?.(event.target.value)}
              aria-invalid={Boolean(roundCountError)}
              aria-describedby={
                roundCountError ? `${context}-custom-round-count-error` : undefined
              }
            />
            {roundCountError && (
              <p
                id={`${context}-custom-round-count-error`}
                className={styles.errorText}
                role="alert"
              >
                {roundCountError}
              </p>
            )}
          </>
        ) : (
          <p className={styles.sectionCopy}>
            Configured rounds for this game: <strong>{configuredRoundCount}</strong>.
          </p>
        )}
      </fieldset>

      {onResetSavedGame && (
        <div className={styles.settingsActionRow}>
          <button className={styles.button} type="button" onClick={onResetSavedGame}>
            Reset Saved Game
          </button>
          <p className={styles.sectionCopy}>
            This clears local saved progress after confirmation.
          </p>
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

      {isGameplayContext && (
        <p className={styles.sectionCopy}>Theme updates apply immediately.</p>
      )}
    </aside>
  );
}
