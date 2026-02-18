import {
  DEFAULT_ROUND_COUNT,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROUND_COUNT_PRESETS
} from "@/game/constants";
import type { DiceMode, GameState, ThemePreference } from "@/game/models";

export const CUSTOM_ROUND_COUNT = "custom";
export type RoundCountOption =
  | (typeof ROUND_COUNT_PRESETS)[number]
  | typeof CUSTOM_ROUND_COUNT;

export interface SetupState {
  playerNames: string[];
  roundCountOption: RoundCountOption;
  customRoundCount: string;
  diceMode: DiceMode;
  theme: ThemePreference;
}

export interface SetupConfig {
  playerNames: string[];
  roundCount: number;
  diceMode: DiceMode;
  theme: ThemePreference;
}

export interface SetupValidation {
  isValid: boolean;
  playerCountError: string | null;
  playerErrors: Array<string | null>;
  roundCountError: string | null;
}

const DEFAULT_NAME = "";
const MIN_CUSTOM_ROUNDS = 1;

export function createDefaultSetupState(): SetupState {
  return {
    playerNames: Array.from({ length: MIN_PLAYERS }, () => DEFAULT_NAME),
    roundCountOption: DEFAULT_ROUND_COUNT,
    customRoundCount: "",
    diceMode: "built-in",
    theme: "system"
  };
}

export function resizePlayerNames(
  playerNames: string[],
  nextCount: number
): string[] {
  const targetCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, nextCount));

  if (targetCount <= playerNames.length) {
    return playerNames.slice(0, targetCount);
  }

  const appendCount = targetCount - playerNames.length;
  return [
    ...playerNames,
    ...Array.from({ length: appendCount }, () => DEFAULT_NAME)
  ];
}

export function resolveRoundCount(
  roundCountOption: RoundCountOption,
  customRoundCount: string
): number | null {
  if (roundCountOption !== CUSTOM_ROUND_COUNT) {
    return roundCountOption;
  }

  const parsedValue = Number.parseInt(customRoundCount, 10);
  if (!Number.isInteger(parsedValue) || parsedValue < MIN_CUSTOM_ROUNDS) {
    return null;
  }

  return parsedValue;
}

export function validateSetup(setupState: SetupState): SetupValidation {
  const normalizedNames = normalizeNames(setupState.playerNames);
  const playerErrors = findPlayerErrors(normalizedNames);
  const playerCountError = validatePlayerCount(setupState.playerNames.length);
  const roundCount = resolveRoundCount(
    setupState.roundCountOption,
    setupState.customRoundCount
  );
  const roundCountError =
    roundCount === null
      ? "Custom rounds must be a whole number greater than 0."
      : null;

  const hasPlayerErrors = playerErrors.some((error) => error !== null);

  return {
    isValid: !playerCountError && !hasPlayerErrors && !roundCountError,
    playerCountError,
    playerErrors,
    roundCountError
  };
}

export function buildSetupConfig(setupState: SetupState): SetupConfig | null {
  const validation = validateSetup(setupState);
  if (!validation.isValid) {
    return null;
  }

  const roundCount = resolveRoundCount(
    setupState.roundCountOption,
    setupState.customRoundCount
  );
  if (roundCount === null) {
    return null;
  }

  return {
    playerNames: normalizeNames(setupState.playerNames),
    roundCount,
    diceMode: setupState.diceMode,
    theme: setupState.theme
  };
}

export function createInitialGameState(setupConfig: SetupConfig): GameState {
  return {
    players: setupConfig.playerNames.map((playerName, index) => ({
      id: `player-${index + 1}`,
      name: playerName,
      score: 0,
      hasBankedThisRound: false
    })),
    settings: {
      roundCount: setupConfig.roundCount,
      diceMode: setupConfig.diceMode,
      theme: setupConfig.theme
    },
    round: {
      currentRound: 1,
      bankTotal: 0,
      bankedPlayerIds: [],
      turnCountInRound: 0
    },
    turn: {
      activePlayerIndex: 0,
      hasRolledThisTurn: false,
      lastRoll: null
    },
    rollHistory: [
      {
        roundNumber: 1,
        entries: []
      }
    ],
    status: {
      screen: "gameplay",
      isGameComplete: false,
      winnerIds: []
    }
  };
}

function normalizeNames(playerNames: string[]): string[] {
  return playerNames.map((name) => name.trim());
}

function validatePlayerCount(playerCount: number): string | null {
  if (playerCount < MIN_PLAYERS) {
    return `At least ${MIN_PLAYERS} players are required.`;
  }

  if (playerCount > MAX_PLAYERS) {
    return `A maximum of ${MAX_PLAYERS} players are allowed.`;
  }

  return null;
}

function findPlayerErrors(normalizedNames: string[]): Array<string | null> {
  const playerErrors = normalizedNames.map(() => null as string | null);
  const nameToIndexes = new Map<string, number[]>();

  normalizedNames.forEach((name, index) => {
    if (!name) {
      playerErrors[index] = "Name is required.";
      return;
    }

    const lookupName = name.toLocaleLowerCase();
    const indexes = nameToIndexes.get(lookupName);
    if (indexes) {
      indexes.push(index);
      return;
    }

    nameToIndexes.set(lookupName, [index]);
  });

  nameToIndexes.forEach((indexes) => {
    if (indexes.length < 2) {
      return;
    }

    indexes.forEach((index) => {
      playerErrors[index] = "Name must be unique.";
    });
  });

  return playerErrors;
}
