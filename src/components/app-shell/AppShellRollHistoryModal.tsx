import type { GameState } from "@/game/models";
import styles from "../AppShell.module.css";
import type { RoundHistoryStats } from "./appShellUtils";

interface AppShellRollHistoryModalProps {
  isOpen: boolean;
  gameState: GameState | null;
  hasRollHistory: boolean;
  roundHistoryStats: RoundHistoryStats[];
  playerNameById: Map<string, string>;
  onClose: () => void;
}

export default function AppShellRollHistoryModal({
  isOpen,
  gameState,
  hasRollHistory,
  roundHistoryStats,
  playerNameById,
  onClose,
}: AppShellRollHistoryModalProps) {
  if (!isOpen || !gameState) {
    return null;
  }

  return (
    <div
      className={styles.rollHistoryModalBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={styles.rollHistoryModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roll-history-modal-heading"
      >
        <button
          className={styles.rollHistoryModalCloseButton}
          type="button"
          onClick={onClose}
          aria-label="Close roll history"
        >
          <span aria-hidden="true">&times;</span>
        </button>
        <section className={styles.section}>
          <h2 id="roll-history-modal-heading" className={styles.sectionHeading}>
            Roll History
          </h2>
          {!hasRollHistory && (
            <p className={styles.sectionCopy}>
              No rolls have been recorded yet.
            </p>
          )}
          <div className={styles.rollHistoryRoundList}>
            {roundHistoryStats.map((roundHistory) => (
              <article
                key={roundHistory.roundNumber}
                className={styles.rollHistoryRoundCard}
              >
                <h3 className={styles.rollHistoryRoundHeading}>
                  Round {roundHistory.roundNumber}
                </h3>
                {roundHistory.entries.length === 0 ? (
                  <p className={styles.sectionCopy}>
                    No turns played in this round.
                  </p>
                ) : (
                  <>
                    <p className={styles.rollHistorySummary}>
                      Doubles {roundHistory.doublesCount} | Sevens{" "}
                      {roundHistory.sevenCount} | Max bank $
                      {roundHistory.maxBankAfterRoll}
                    </p>
                    <ol className={styles.rollHistoryEntryList}>
                      {roundHistory.entries.map((entry, entryIndex) => {
                        const playerName =
                          playerNameById.get(entry.playerId) ??
                          "Unknown player";
                        const previousBankTotal =
                          roundHistory.entries[entryIndex - 1]
                            ?.bankTotalAfterRoll ?? 0;

                        return (
                          <li
                            key={`${roundHistory.roundNumber}-${entry.turnNumber}-${entry.playerId}`}
                          >
                            <em>{playerName}</em> rolled {entry.dieOne} and{" "}
                            {entry.dieTwo} for $
                            {entry.isDouble && entry.turnNumber > 3
                              ? previousBankTotal
                              : entry.total}
                            .{" "}
                            {entry.isBust ? (
                              <strong>Bust.</strong>
                            ) : (
                              <>
                                Bank total:{" "}
                                <em> ${entry.bankTotalAfterRoll}.</em>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
