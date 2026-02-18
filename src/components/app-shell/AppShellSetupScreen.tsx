import { MAX_PLAYERS, MIN_PLAYERS, ROUND_COUNT_PRESETS } from "@/game/constants";
import type { DiceMode, GameScreen } from "@/game/models";
import {
  CUSTOM_ROUND_COUNT,
  type RoundCountOption,
  type SetupState,
  type SetupValidation,
} from "@/state";
import type { ChangeEvent, FormEvent } from "react";
import styles from "../AppShell.module.css";
import SettingsIconButton from "../SettingsIconButton";
import { buildClassNames } from "./appShellUtils";

const PLAYER_COUNT_OPTIONS = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, index) => MIN_PLAYERS + index,
);

interface AppShellSetupScreenProps {
  activeScreen: GameScreen;
  isSettingsOpen: boolean;
  showResumePrompt: boolean;
  setupState: SetupState;
  setupValidation: SetupValidation;
  onOpenSettings: () => void;
  onResumeGame: () => void;
  onStartNewGame: () => void;
  onStartGame: (event: FormEvent<HTMLFormElement>) => void;
  onPlayerCountChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onPlayerNameChange: (index: number, nextValue: string) => void;
  onDiceModeChange: (nextMode: DiceMode) => void;
  onRoundCountOptionChange: (nextOption: RoundCountOption) => void;
  onCustomRoundCountChange: (nextValue: string) => void;
}

export default function AppShellSetupScreen({
  activeScreen,
  isSettingsOpen,
  showResumePrompt,
  setupState,
  setupValidation,
  onOpenSettings,
  onResumeGame,
  onStartNewGame,
  onStartGame,
  onPlayerCountChange,
  onPlayerNameChange,
  onDiceModeChange,
  onRoundCountOptionChange,
  onCustomRoundCountChange,
}: AppShellSetupScreenProps) {
  return (
    <>
      {activeScreen === "setup" && (
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Play Bank Dice Game Online</h1>
          </div>
          <p className={styles.subtitle}>
            Play Bank Dice Game Online in a fast multiplayer format: roll dice,
            grow the communal bank, and choose when to secure money before busts
            end a round.
          </p>
        </header>
      )}

      <section aria-labelledby="setup-heading" hidden={activeScreen !== "setup"}>
        <div className={styles.gameplayHeader}>
          <h2 id="setup-heading" className={styles.sectionHeading}>
            Setup
          </h2>
          <SettingsIconButton isOpen={isSettingsOpen} onClick={onOpenSettings} />
        </div>

        {showResumePrompt ? (
          <div className={styles.resumePrompt} role="dialog" aria-modal="false">
            <p className={styles.sectionCopy}>
              Saved game found. Resume where you left off or start a new game.
            </p>
            <div className={styles.actionRow}>
              <button className={styles.button} type="button" onClick={onResumeGame}>
                Resume Game
              </button>
              <button className={styles.button} type="button" onClick={onStartNewGame}>
                New Game
              </button>
            </div>
          </div>
        ) : (
          <form className={styles.setupForm} onSubmit={onStartGame} noValidate>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Players</legend>
              <label className={styles.label} htmlFor="player-count">
                Player count
              </label>
              <select
                id="player-count"
                className={styles.input}
                value={setupState.playerNames.length}
                onChange={onPlayerCountChange}
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
                        onChange={(event) => onPlayerNameChange(index, event.target.value)}
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
              <legend className={styles.legend}>Dice mode</legend>
              <div className={styles.radioRow}>
                <label className={styles.optionLabel}>
                  <input
                    type="radio"
                    name="setup-dice-mode"
                    value="built-in"
                    checked={setupState.diceMode === "built-in"}
                    onChange={() => onDiceModeChange("built-in")}
                  />
                  <span>Built-in</span>
                </label>
                <label className={styles.optionLabel}>
                  <input
                    type="radio"
                    name="setup-dice-mode"
                    value="manual"
                    checked={setupState.diceMode === "manual"}
                    onChange={() => onDiceModeChange("manual")}
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
                      onChange={() => onRoundCountOptionChange(preset)}
                    />
                    <span>{preset} rounds</span>
                  </label>
                ))}
                <label className={styles.optionLabel}>
                  <input
                    type="radio"
                    name="setup-round-count"
                    value={CUSTOM_ROUND_COUNT}
                    checked={setupState.roundCountOption === CUSTOM_ROUND_COUNT}
                    onChange={() => onRoundCountOptionChange(CUSTOM_ROUND_COUNT)}
                  />
                  <span>Custom</span>
                </label>
              </div>
              <label className={styles.label} htmlFor="setup-custom-round-count">
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
                onChange={(event) => onCustomRoundCountChange(event.target.value)}
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
                className={buildClassNames(styles.button, styles.primaryButton)}
                type="submit"
                disabled={!setupValidation.isValid}
              >
                Start Game
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
