import type { GameState } from "@/game/models";
import styles from "./AppShell.module.css";

interface GameplayPanelProps {
  canRoll: boolean;
  canBank: boolean;
  gameState: GameState;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  onRoll: () => void;
  onBankActivePlayer: () => void;
  onBankPlayer: (playerId: string) => void;
  onAdvanceTurn: () => void;
}

function buildPlayerRowClassNames(
  isActivePlayer: boolean,
  hasBankedThisRound: boolean
): string {
  return [
    styles.playerRow,
    isActivePlayer ? styles.playerRowActive : "",
    hasBankedThisRound ? styles.playerRowBanked : ""
  ]
    .filter(Boolean)
    .join(" ");
}

export default function GameplayPanel({
  canRoll,
  canBank,
  gameState,
  isSettingsOpen,
  onToggleSettings,
  onRoll,
  onBankActivePlayer,
  onBankPlayer,
  onAdvanceTurn
}: GameplayPanelProps) {
  const activeRoundPlayers = gameState.players.filter(
    (player) => !player.hasBankedThisRound
  );
  const activePlayer = gameState.players[gameState.turn.activePlayerIndex] ?? null;

  return (
    <>
      <div className={styles.gameplayHeader}>
        <div>
          <h2 id="gameplay-heading" className={styles.sectionHeading}>
            Gameplay
          </h2>
          <p className={styles.sectionCopy}>
            Round {gameState.round.currentRound} of {gameState.settings.roundCount}
          </p>
        </div>
        <button
          className={styles.button}
          type="button"
          onClick={onToggleSettings}
          aria-expanded={isSettingsOpen}
          aria-controls="settings-panel"
        >
          Settings
        </button>
      </div>

      {isSettingsOpen && (
        <aside
          id="settings-panel"
          className={styles.settingsPanel}
          aria-label="Current settings"
        >
          <p className={styles.sectionCopy}>Dice mode: {gameState.settings.diceMode}</p>
          <p className={styles.sectionCopy}>Theme: {gameState.settings.theme}</p>
        </aside>
      )}

      <section className={styles.bankCard} aria-label="Communal bank">
        <p className={styles.bankLabel}>Communal Bank Total</p>
        <output
          className={styles.bankTotal}
          aria-live="polite"
          data-testid="communal-bank-total"
        >
          {gameState.round.bankTotal}
        </output>
        {gameState.turn.lastRoll && (
          <p className={styles.sectionCopy}>
            Last roll: {gameState.turn.lastRoll.dieOne} + {gameState.turn.lastRoll.dieTwo} ={" "}
            {gameState.turn.lastRoll.total}
          </p>
        )}
      </section>

      <ol className={styles.scoreboard} aria-label="Scoreboard">
        {gameState.players.map((player, index) => {
          const isActivePlayer = index === gameState.turn.activePlayerIndex;

          return (
            <li
              key={player.id}
              className={buildPlayerRowClassNames(
                isActivePlayer,
                player.hasBankedThisRound
              )}
              aria-current={isActivePlayer ? "true" : undefined}
            >
              <div className={styles.playerIdentity}>
                <span className={styles.playerName}>{player.name}</span>
                <div className={styles.playerBadgeRow}>
                  {isActivePlayer && <span className={styles.activeBadge}>Active</span>}
                  <span
                    className={
                      player.hasBankedThisRound
                        ? styles.bankedBadge
                        : styles.waitingBadge
                    }
                  >
                    {player.hasBankedThisRound ? "Banked" : "In Round"}
                  </span>
                </div>
              </div>
              <p className={styles.playerScore}>Score {player.score}</p>
            </li>
          );
        })}
      </ol>

      <div className={styles.actionRow}>
        <button className={styles.button} type="button" onClick={onRoll} disabled={!canRoll}>
          Roll
        </button>
        <button
          className={styles.button}
          type="button"
          onClick={onBankActivePlayer}
          disabled={!canBank || !activePlayer || activePlayer.hasBankedThisRound}
        >
          Bank
        </button>
      </div>

      {gameState.turn.hasRolledThisTurn && (
        <section className={styles.postTurnPanel} aria-label="Post-turn banking">
          <h3 className={styles.sectionHeading}>Post-turn banking</h3>
          <p className={styles.sectionCopy}>
            Any active player can bank now, or continue without banking.
          </p>
          <div className={styles.postTurnActions}>
            {activeRoundPlayers.map((player) => (
              <button
                key={player.id}
                className={styles.button}
                type="button"
                onClick={() => onBankPlayer(player.id)}
              >
                Bank {player.name}
              </button>
            ))}
            <button className={styles.button} type="button" onClick={onAdvanceTurn}>
              Continue Turn
            </button>
          </div>
        </section>
      )}
    </>
  );
}
