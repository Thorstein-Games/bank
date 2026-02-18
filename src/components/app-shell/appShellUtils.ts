import { ROUND_COUNT_PRESETS } from "@/game/constants";
import type { GameState, RoundRollHistory, ThemePreference } from "@/game/models";
import {
  CUSTOM_ROUND_COUNT,
  createDefaultSetupState,
  type SetupState,
} from "@/state";

export interface LiveAnnouncement {
  id: number;
  text: string;
}

export interface RoundHistoryStats extends RoundRollHistory {
  bustCount: number;
  doublesCount: number;
  sevenCount: number;
  maxBankAfterRoll: number;
}

export function createSetupStateWithTheme(theme: ThemePreference): SetupState {
  return {
    ...createDefaultSetupState(),
    theme,
  };
}

export function getWinnerNames(gameState: GameState): string[] {
  return gameState.status.winnerIds
    .map(
      (winnerId) =>
        gameState.players.find((player) => player.id === winnerId)?.name,
    )
    .filter((winnerName): winnerName is string => Boolean(winnerName));
}

export function isShortcutInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

export function buildWinnerAnnouncement(winnerNames: string[]): string {
  if (winnerNames.length === 0) {
    return "Game complete. No winner recorded.";
  }

  if (winnerNames.length === 1) {
    return `Game complete. Winner: ${winnerNames[0]}.`;
  }

  return `Game complete. Winners: ${winnerNames.join(", ")}.`;
}

export function buildClassNames(...classNames: string[]): string {
  return classNames.filter(Boolean).join(" ");
}

export function buildSetupStateFromCompletedGame(gameState: GameState): SetupState {
  const presetRoundCount = ROUND_COUNT_PRESETS.find(
    (preset) => preset === gameState.settings.roundCount,
  );
  const roundCountOption: SetupState["roundCountOption"] =
    presetRoundCount ?? CUSTOM_ROUND_COUNT;

  return {
    playerNames: gameState.players.map((player) => player.name),
    roundCountOption,
    customRoundCount: presetRoundCount
      ? ""
      : String(gameState.settings.roundCount),
    diceMode: gameState.settings.diceMode,
    theme: gameState.settings.theme,
  };
}

export function buildRoundHistoryStats(
  roundHistory: RoundRollHistory[],
): RoundHistoryStats[] {
  return roundHistory.map((round) => {
    const bustCount = round.entries.filter((entry) => entry.isBust).length;
    const doublesCount = round.entries.filter((entry) => entry.isDouble).length;
    const sevenCount = round.entries.filter((entry) => entry.total === 7).length;
    const maxBankAfterRoll = round.entries.reduce(
      (maxBank, entry) => Math.max(maxBank, entry.bankTotalAfterRoll),
      0,
    );

    return {
      ...round,
      bustCount,
      doublesCount,
      sevenCount,
      maxBankAfterRoll,
    };
  });
}

export function buildFinalStandings(gameState: GameState) {
  return [...gameState.players].sort((leftPlayer, rightPlayer) => {
    if (leftPlayer.score !== rightPlayer.score) {
      return rightPlayer.score - leftPlayer.score;
    }

    return leftPlayer.name.localeCompare(rightPlayer.name);
  });
}

export function buildWinnerSummary(
  winnerNames: string[],
  winningScore: number,
): string {
  if (winnerNames.length === 0) {
    return "No winner was recorded for this game.";
  }

  if (winnerNames.length === 1) {
    return `${winnerNames[0]} takes the game with $${winningScore}.`;
  }

  return `${winnerNames.join(" and ")} tie for first at $${winningScore}.`;
}
