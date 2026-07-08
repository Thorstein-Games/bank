import { ROUND_COUNT_PRESETS } from "@/game/constants";
import type {
  GameState,
  RoundRollHistory,
  ThemePreference,
} from "@/game/models";
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

export interface EndGameNumberProbability {
  total: number;
  count: number;
  probabilityPercent: number;
}

export interface EndGameStats {
  maxBankPotential: number;
  averageTurnsPerRound: number;
  averageDoublesPerRound: number;
  bustRatePercent: number;
  hottestNumber: number | null;
  longestRoundTurns: number;
  totalRolls: number;
  numberProbabilities: EndGameNumberProbability[];
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

export function buildSetupStateFromCompletedGame(
  gameState: GameState,
): SetupState {
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
    const sevenCount = round.entries.filter(
      (entry) => entry.total === 7,
    ).length;
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

export function buildEndGameStats(
  roundHistory: RoundRollHistory[],
): EndGameStats {
  const playedRounds = roundHistory.filter((round) => round.entries.length > 0);
  const roundHistoryStats = buildRoundHistoryStats(playedRounds);
  const allEntries = roundHistoryStats.flatMap((round) => round.entries);
  const totalRolls = allEntries.length;
  const totalRounds = roundHistoryStats.length;
  const totalDoubles = allEntries.filter((entry) => entry.isDouble).length;
  const totalBusts = allEntries.filter((entry) => entry.isBust).length;
  const longestRoundTurns = roundHistoryStats.reduce(
    (maxTurns, round) => Math.max(maxTurns, round.entries.length),
    0,
  );
  const maxBankPotential = roundHistoryStats.reduce(
    (maxBank, entry) => maxBank + entry.maxBankAfterRoll,
    0,
  );

  const numberCounts = new Map<number, number>();
  for (let total = 2; total <= 12; total += 1) {
    numberCounts.set(total, 0);
  }
  for (const entry of allEntries) {
    numberCounts.set(entry.total, (numberCounts.get(entry.total) ?? 0) + 1);
  }

  const numberProbabilities: EndGameNumberProbability[] = [];
  for (let total = 2; total <= 12; total += 1) {
    const count = numberCounts.get(total) ?? 0;
    const probabilityPercent = totalRolls > 0 ? (count / totalRolls) * 100 : 0;
    numberProbabilities.push({
      total,
      count,
      probabilityPercent,
    });
  }

  const hottestProbability = numberProbabilities.reduce(
    (currentMax, item) => Math.max(currentMax, item.probabilityPercent),
    0,
  );
  const hottestNumber =
    hottestProbability > 0
      ? (numberProbabilities.find(
          (item) => item.probabilityPercent === hottestProbability,
        )?.total ?? null)
      : null;

  return {
    maxBankPotential,
    averageTurnsPerRound: totalRounds > 0 ? totalRolls / totalRounds : 0,
    averageDoublesPerRound: totalRounds > 0 ? totalDoubles / totalRounds : 0,
    bustRatePercent: totalRolls > 0 ? (totalBusts / totalRolls) * 100 : 0,
    hottestNumber,
    longestRoundTurns,
    totalRolls,
    numberProbabilities,
  };
}

export function buildFinalStandings(gameState: GameState) {
  return [...gameState.players].sort((leftPlayer, rightPlayer) => {
    if (leftPlayer.score !== rightPlayer.score) {
      return rightPlayer.score - leftPlayer.score;
    }

    return leftPlayer.name.localeCompare(rightPlayer.name);
  });
}
