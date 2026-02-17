import { createInitialGameState } from "@/state";
import {
  AUDIO_MUTED_STORAGE_KEY,
  GAME_SAVE_SCHEMA_VERSION,
  GAME_SAVE_STORAGE_KEY,
  readPersistedGameSnapshot,
  readPersistedAudioMuted,
  readPersistedThemePreference,
  THEME_PREFERENCE_STORAGE_KEY,
  type PersistedGameSnapshot
} from "@/state/persistence";

function buildValidSnapshot(): PersistedGameSnapshot {
  return {
    schemaVersion: GAME_SAVE_SCHEMA_VERSION,
    gameState: createInitialGameState({
      playerNames: ["Alice", "Bob"],
      roundCount: 10,
      diceMode: "built-in",
      theme: "system"
    }),
    pendingRoll: {
      dieOne: 2,
      dieTwo: 5
    }
  };
}

describe("readPersistedGameSnapshot", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns a valid saved snapshot", () => {
    const snapshot = buildValidSnapshot();
    window.localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify(snapshot));

    expect(readPersistedGameSnapshot()).toEqual(snapshot);
  });

  it("drops incompatible schema versions", () => {
    const snapshot = {
      ...buildValidSnapshot(),
      schemaVersion: GAME_SAVE_SCHEMA_VERSION + 1
    };
    window.localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify(snapshot));

    expect(readPersistedGameSnapshot()).toBeNull();
    expect(window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBeNull();
  });

  it("drops malformed saved snapshots", () => {
    const malformedSnapshot = {
      schemaVersion: GAME_SAVE_SCHEMA_VERSION,
      gameState: {
        players: []
      },
      pendingRoll: null
    };
    window.localStorage.setItem(
      GAME_SAVE_STORAGE_KEY,
      JSON.stringify(malformedSnapshot)
    );

    expect(readPersistedGameSnapshot()).toBeNull();
    expect(window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBeNull();
  });
});

describe("readPersistedThemePreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when no explicit theme override exists", () => {
    expect(readPersistedThemePreference()).toBeNull();
  });

  it("returns light and dark theme overrides", () => {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, JSON.stringify("light"));
    expect(readPersistedThemePreference()).toBe("light");

    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, JSON.stringify("dark"));
    expect(readPersistedThemePreference()).toBe("dark");
  });

  it("drops unsupported theme values", () => {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, JSON.stringify("system"));

    expect(readPersistedThemePreference()).toBeNull();
    expect(window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).toBeNull();
  });
});

describe("readPersistedAudioMuted", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to false when no audio preference exists", () => {
    expect(readPersistedAudioMuted()).toBe(false);
  });

  it("returns persisted boolean values", () => {
    window.localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, JSON.stringify(true));
    expect(readPersistedAudioMuted()).toBe(true);

    window.localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, JSON.stringify(false));
    expect(readPersistedAudioMuted()).toBe(false);
  });

  it("drops malformed audio values", () => {
    window.localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, JSON.stringify("true"));

    expect(readPersistedAudioMuted()).toBe(false);
    expect(window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY)).toBeNull();
  });
});
