import type { GameState } from "@/game/models";
import { gameReducer } from "@/game/reducer";
import { createInitialGameState } from "@/state";
import {
  AUDIO_MUTED_STORAGE_KEY,
  GAME_SAVE_SCHEMA_VERSION,
  GAME_SAVE_STORAGE_KEY,
  THEME_PREFERENCE_STORAGE_KEY,
  clearPersistedGameSnapshot,
  readPersistedAudioMuted,
  readPersistedGameSnapshot,
  readPersistedThemePreference,
  writePersistedAudioMuted,
  writePersistedGameSnapshot,
  writePersistedThemePreference,
  type PersistedGameSnapshot,
} from "@/state/persistence";

function midGameState(): GameState {
  let state = createInitialGameState({
    playerNames: ["Ann", "Ben", "Cat"],
    roundCount: 3,
    diceMode: "manual",
    theme: "dark",
  });
  for (const [dieOne, dieTwo] of [[2, 3], [4, 4], [1, 6], [3, 3]]) {
    state = gameReducer(state, { type: "resolve-roll", dieOne, dieTwo });
    state = gameReducer(state, { type: "advance-turn" });
  }
  return gameReducer(state, { type: "bank-player", playerId: state.players[2].id });
}

function snapshot(gameState = midGameState()): PersistedGameSnapshot {
  return { schemaVersion: GAME_SAVE_SCHEMA_VERSION, gameState, pendingRoll: null };
}

function store(value: unknown) {
  window.localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify(value));
}

beforeEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe("game snapshot round trip", () => {
  it("restores a mid-game save exactly", () => {
    const saved = snapshot();
    expect(writePersistedGameSnapshot(saved)).toBe(true);
    expect(readPersistedGameSnapshot()).toEqual(saved);
    expect(saved.gameState.round.bankTotal).toBeGreaterThan(0);
    expect(saved.gameState.players[2].hasBankedThisRound).toBe(true);
  });

  it("restores a pending (mid-animation) roll", () => {
    const saved = { ...snapshot(), pendingRoll: { dieOne: 6, dieTwo: 1 } };
    writePersistedGameSnapshot(saved);
    expect(readPersistedGameSnapshot()?.pendingRoll).toEqual({ dieOne: 6, dieTwo: 1 });
  });

  it("restores a finished game", () => {
    const finished: GameState = {
      ...midGameState(),
      status: { screen: "end-of-game", isGameComplete: true, winnerIds: ["player-3"] },
    };
    writePersistedGameSnapshot(snapshot(finished));
    expect(readPersistedGameSnapshot()?.gameState.status.isGameComplete).toBe(true);
  });

  it("clears the save", () => {
    writePersistedGameSnapshot(snapshot());
    expect(clearPersistedGameSnapshot()).toBe(true);
    expect(readPersistedGameSnapshot()).toBeNull();
  });

  it("uses a versioned key", () => {
    expect(GAME_SAVE_STORAGE_KEY).toBe("bank-game:v1:saved-run");
  });
});

describe("corrupt saves fall back to no save", () => {
  it("returns null for non-JSON data without throwing", () => {
    window.localStorage.setItem(GAME_SAVE_STORAGE_KEY, "{not json");
    expect(readPersistedGameSnapshot()).toBeNull();
  });

  it.each([
    ["a string", "hello"],
    ["a number", 42],
    ["an array", []],
    ["an older schema", { ...snapshot(), schemaVersion: 1 }],
    ["no schema version", { gameState: midGameState(), pendingRoll: null }],
  ])("drops %s and removes it from storage", (_label, value) => {
    store(value);
    expect(readPersistedGameSnapshot()).toBeNull();
    expect(window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBeNull();
  });

  type Mutation = (state: GameState) => unknown;
  const mutations: Array<[string, Mutation]> = [
    ["one player", (s) => ({ ...s, players: s.players.slice(0, 1) })],
    [
      "17 players",
      (s) => ({
        ...s,
        players: Array.from({ length: 17 }, (_, i) => ({ ...s.players[0], id: `p${i}` })),
      }),
    ],
    ["duplicate player ids", (s) => ({ ...s, players: [s.players[0], s.players[0], s.players[1]] })],
    ["a blank player name", (s) => ({ ...s, players: [{ ...s.players[0], name: " " }, ...s.players.slice(1)] })],
    ["a non-numeric score", (s) => ({ ...s, players: [{ ...s.players[0], score: "10" }, ...s.players.slice(1)] })],
    ["an unknown dice mode", (s) => ({ ...s, settings: { ...s.settings, diceMode: "loaded" } })],
    ["an unknown theme", (s) => ({ ...s, settings: { ...s.settings, theme: "neon" } })],
    ["zero rounds", (s) => ({ ...s, settings: { ...s.settings, roundCount: 0 } })],
    ["round 0", (s) => ({ ...s, round: { ...s.round, currentRound: 0 } })],
    ["an infinite bank", (s) => ({ ...s, round: { ...s.round, bankTotal: null } })],
    ["a banked id that is not a player", (s) => ({ ...s, round: { ...s.round, bankedPlayerIds: ["ghost"] } })],
    ["an active index past the last player", (s) => ({ ...s, turn: { ...s.turn, activePlayerIndex: 3 } })],
    ["a last roll whose total is wrong", (s) => ({ ...s, turn: { ...s.turn, lastRoll: { dieOne: 1, dieTwo: 2, total: 4, isDouble: false } } })],
    ["a die face of 7", (s) => ({ ...s, turn: { ...s.turn, lastRoll: { dieOne: 7, dieTwo: 1, total: 8, isDouble: false } } })],
    ["history for a round past the end", (s) => ({ ...s, rollHistory: [...s.rollHistory, { roundNumber: 4, entries: [] }] })],
    ["history rounds out of order", (s) => ({ ...s, rollHistory: [{ roundNumber: 2, entries: [] }, { roundNumber: 1, entries: [] }] })],
    [
      "a history entry with a mislabelled double",
      (s) => ({
        ...s,
        rollHistory: [{ roundNumber: 1, entries: [{ ...s.rollHistory[0].entries[0], isDouble: true }] }],
      }),
    ],
    ["an unknown screen", (s) => ({ ...s, status: { ...s.status, screen: "lobby" } })],
    ["non-string winner ids", (s) => ({ ...s, status: { ...s.status, winnerIds: [1] } })],
  ];

  it.each(mutations)("rejects a game state with %s", (_label, mutate) => {
    store({ ...snapshot(), gameState: mutate(midGameState()) });
    expect(readPersistedGameSnapshot()).toBeNull();
    expect(window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBeNull();
  });

  it.each([
    ["a die face of 0", { dieOne: 0, dieTwo: 3 }],
    ["a missing die", { dieOne: 4 }],
    ["a string", "6,1"],
  ])("rejects a pending roll with %s", (_label, pendingRoll) => {
    store({ ...snapshot(), pendingRoll });
    expect(readPersistedGameSnapshot()).toBeNull();
  });
});

describe("storage failures", () => {
  it("reports a failed write (quota exceeded) instead of throwing", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(writePersistedGameSnapshot(snapshot())).toBe(false);
  });

  it("treats unreadable storage as no save", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(readPersistedGameSnapshot()).toBeNull();
    expect(readPersistedThemePreference()).toBeNull();
    expect(readPersistedAudioMuted()).toBe(false);
  });
});

describe("theme and audio preferences", () => {
  it("stores light/dark and removes the key for system", () => {
    writePersistedThemePreference("dark");
    expect(readPersistedThemePreference()).toBe("dark");
    writePersistedThemePreference("light");
    expect(readPersistedThemePreference()).toBe("light");
    writePersistedThemePreference("system");
    expect(window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).toBeNull();
    expect(readPersistedThemePreference()).toBeNull();
  });

  it("round-trips the mute flag", () => {
    writePersistedAudioMuted(true);
    expect(window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY)).toBe("true");
    expect(readPersistedAudioMuted()).toBe(true);
    writePersistedAudioMuted(false);
    expect(readPersistedAudioMuted()).toBe(false);
  });
});
