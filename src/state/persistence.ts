import { DIE_MAX, DIE_MIN, MAX_PLAYERS, MIN_PLAYERS } from "@/game/constants";
import type {
  DiceMode,
  DiceRoll,
  GameScreen,
  GameState,
  ThemePreference
} from "@/game/models";
import {
  buildVersionedStorageKey,
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage
} from "@/utils/localStorage";

export const GAME_SAVE_SCHEMA_VERSION = 2;
export const GAME_SAVE_STORAGE_KEY = buildVersionedStorageKey("saved-run");
export const THEME_PREFERENCE_STORAGE_KEY = buildVersionedStorageKey(
  "theme-preference"
);
export const AUDIO_MUTED_STORAGE_KEY = buildVersionedStorageKey("audio-muted");

export interface PersistedPendingRoll {
  dieOne: number;
  dieTwo: number;
}

export interface PersistedGameSnapshot {
  schemaVersion: number;
  gameState: GameState;
  pendingRoll: PersistedPendingRoll | null;
}

export type PersistedThemePreference = Exclude<ThemePreference, "system">;

export function readPersistedGameSnapshot(): PersistedGameSnapshot | null {
  const parsedValue = readLocalStorage<unknown>(GAME_SAVE_STORAGE_KEY, null);
  if (!isPersistedGameSnapshot(parsedValue)) {
    if (parsedValue !== null) {
      removeLocalStorage(GAME_SAVE_STORAGE_KEY);
    }
    return null;
  }

  return parsedValue;
}

export function writePersistedGameSnapshot(snapshot: PersistedGameSnapshot): boolean {
  return writeLocalStorage(GAME_SAVE_STORAGE_KEY, snapshot);
}

export function clearPersistedGameSnapshot(): boolean {
  return removeLocalStorage(GAME_SAVE_STORAGE_KEY);
}

export function readPersistedThemePreference(): PersistedThemePreference | null {
  const parsedValue = readLocalStorage<unknown>(THEME_PREFERENCE_STORAGE_KEY, null);
  if (!isPersistedThemePreference(parsedValue)) {
    if (parsedValue !== null) {
      removeLocalStorage(THEME_PREFERENCE_STORAGE_KEY);
    }

    return null;
  }

  return parsedValue;
}

export function writePersistedThemePreference(
  preference: ThemePreference
): boolean {
  if (preference === "system") {
    return removeLocalStorage(THEME_PREFERENCE_STORAGE_KEY);
  }

  return writeLocalStorage(THEME_PREFERENCE_STORAGE_KEY, preference);
}

export function readPersistedAudioMuted(): boolean {
  const parsedValue = readLocalStorage<unknown>(AUDIO_MUTED_STORAGE_KEY, false);
  if (typeof parsedValue === "boolean") {
    return parsedValue;
  }

  removeLocalStorage(AUDIO_MUTED_STORAGE_KEY);
  return false;
}

export function writePersistedAudioMuted(isMuted: boolean): boolean {
  return writeLocalStorage(AUDIO_MUTED_STORAGE_KEY, isMuted);
}

function isPersistedGameSnapshot(value: unknown): value is PersistedGameSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  if (value.schemaVersion !== GAME_SAVE_SCHEMA_VERSION) {
    return false;
  }

  if (!isGameState(value.gameState)) {
    return false;
  }

  return isPendingRoll(value.pendingRoll);
}

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isPlayerArray(value.players) &&
    isGameSettings(value.settings) &&
    isRoundState(value.round, value.players) &&
    isTurnState(value.turn, value.players.length) &&
    isRoundRollHistory(value.rollHistory, value.players, value.settings.roundCount) &&
    isGameStatus(value.status)
  );
}

function isPlayerArray(value: unknown): value is GameState["players"] {
  if (!Array.isArray(value)) {
    return false;
  }

  if (value.length < MIN_PLAYERS || value.length > MAX_PLAYERS) {
    return false;
  }

  const seenIds = new Set<string>();

  return value.every((player) => {
    if (!isRecord(player)) {
      return false;
    }

    if (
      typeof player.id !== "string" ||
      player.id.length === 0 ||
      seenIds.has(player.id)
    ) {
      return false;
    }

    seenIds.add(player.id);

    return (
      typeof player.name === "string" &&
      player.name.trim().length > 0 &&
      isFiniteNumber(player.score) &&
      typeof player.hasBankedThisRound === "boolean"
    );
  });
}

function isGameSettings(value: unknown): value is GameState["settings"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isPositiveInteger(value.roundCount) &&
    isDiceMode(value.diceMode) &&
    isThemePreference(value.theme)
  );
}

function isRoundState(
  value: unknown,
  players: GameState["players"]
): value is GameState["round"] {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isPositiveInteger(value.currentRound) ||
    !isFiniteNumber(value.bankTotal) ||
    !isPositiveOrZeroInteger(value.turnCountInRound)
  ) {
    return false;
  }

  if (!Array.isArray(value.bankedPlayerIds)) {
    return false;
  }

  const playerIdSet = new Set(players.map((player) => player.id));

  return value.bankedPlayerIds.every(
    (bankedPlayerId) =>
      typeof bankedPlayerId === "string" && playerIdSet.has(bankedPlayerId)
  );
}

function isTurnState(
  value: unknown,
  playerCount: number
): value is GameState["turn"] {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isPositiveOrZeroInteger(value.activePlayerIndex) ||
    value.activePlayerIndex >= playerCount ||
    typeof value.hasRolledThisTurn !== "boolean"
  ) {
    return false;
  }

  return value.lastRoll === null || isDiceRoll(value.lastRoll);
}

function isGameStatus(value: unknown): value is GameState["status"] {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isGameScreen(value.screen) ||
    typeof value.isGameComplete !== "boolean" ||
    !Array.isArray(value.winnerIds)
  ) {
    return false;
  }

  return value.winnerIds.every((winnerId) => typeof winnerId === "string");
}

function isRoundRollHistory(
  value: unknown,
  players: GameState["players"],
  roundCount: number
): value is GameState["rollHistory"] {
  if (!Array.isArray(value)) {
    return false;
  }

  const playerIdSet = new Set(players.map((player) => player.id));
  let previousRoundNumber = 0;

  return value.every((roundHistory) => {
    if (!isRecord(roundHistory)) {
      return false;
    }

    if (
      !isPositiveInteger(roundHistory.roundNumber) ||
      roundHistory.roundNumber > roundCount ||
      roundHistory.roundNumber <= previousRoundNumber ||
      !Array.isArray(roundHistory.entries)
    ) {
      return false;
    }

    previousRoundNumber = roundHistory.roundNumber;
    return roundHistory.entries.every((entry) => {
      if (!isRecord(entry)) {
        return false;
      }

      return (
        typeof entry.playerId === "string" &&
        playerIdSet.has(entry.playerId) &&
        isPositiveInteger(entry.turnNumber) &&
        isDieValue(entry.dieOne) &&
        isDieValue(entry.dieTwo) &&
        entry.total === entry.dieOne + entry.dieTwo &&
        entry.isDouble === (entry.dieOne === entry.dieTwo) &&
        typeof entry.isBust === "boolean" &&
        isFiniteNumber(entry.bankTotalAfterRoll)
      );
    });
  });
}

function isDiceRoll(value: unknown): value is DiceRoll {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isDieValue(value.dieOne) &&
    isDieValue(value.dieTwo) &&
    value.total === value.dieOne + value.dieTwo &&
    value.isDouble === (value.dieOne === value.dieTwo)
  );
}

function isPendingRoll(value: unknown): value is PersistedPendingRoll | null {
  if (value === null) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  return isDieValue(value.dieOne) && isDieValue(value.dieTwo);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isPositiveOrZeroInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isDieValue(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= DIE_MIN &&
    value <= DIE_MAX
  );
}

function isDiceMode(value: unknown): value is DiceMode {
  return value === "built-in" || value === "manual";
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function isGameScreen(value: unknown): value is GameScreen {
  return value === "setup" || value === "gameplay" || value === "end-of-game";
}

function isPersistedThemePreference(value: unknown): value is PersistedThemePreference {
  return value === "light" || value === "dark";
}
