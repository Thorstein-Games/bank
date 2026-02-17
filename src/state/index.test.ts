import { DEFAULT_ROUND_COUNT } from "@/game/constants";
import {
  buildSetupConfig,
  createInitialGameState,
  CUSTOM_ROUND_COUNT,
  type SetupState,
  validateSetup
} from "@/state";

function buildSetupState(overrides: Partial<SetupState> = {}): SetupState {
  return {
    playerNames: ["Alice", "Bob"],
    roundCountOption: DEFAULT_ROUND_COUNT,
    customRoundCount: "",
    diceMode: "built-in",
    theme: "system",
    ...overrides
  };
}

describe("validateSetup", () => {
  it("flags empty and duplicate player names inline", () => {
    const setupState = buildSetupState({
      playerNames: ["Alice", " ", "alice"]
    });

    const validation = validateSetup(setupState);

    expect(validation.isValid).toBe(false);
    expect(validation.playerCountError).toBeNull();
    expect(validation.playerErrors).toEqual([
      "Name must be unique.",
      "Name is required.",
      "Name must be unique."
    ]);
  });

  it("requires a valid custom round count", () => {
    const invalidSetupState = buildSetupState({
      roundCountOption: CUSTOM_ROUND_COUNT,
      customRoundCount: "0"
    });

    const validation = validateSetup(invalidSetupState);
    expect(validation.isValid).toBe(false);
    expect(validation.roundCountError).toBe(
      "Custom rounds must be a whole number greater than 0."
    );
    expect(buildSetupConfig(invalidSetupState)).toBeNull();
  });

  it("returns normalized setup config when setup is valid", () => {
    const setupState = buildSetupState({
      playerNames: ["  Ada  ", "Grace"],
      roundCountOption: CUSTOM_ROUND_COUNT,
      customRoundCount: "12",
      diceMode: "manual",
      theme: "dark"
    });

    expect(buildSetupConfig(setupState)).toEqual({
      playerNames: ["Ada", "Grace"],
      roundCount: 12,
      diceMode: "manual",
      theme: "dark"
    });
  });
});

describe("createInitialGameState", () => {
  it("creates a locked initial gameplay state from setup config", () => {
    const gameState = createInitialGameState({
      playerNames: ["Ada", "Grace"],
      roundCount: 15,
      diceMode: "manual",
      theme: "light"
    });

    expect(gameState.players).toEqual([
      {
        id: "player-1",
        name: "Ada",
        score: 0,
        hasBankedThisRound: false
      },
      {
        id: "player-2",
        name: "Grace",
        score: 0,
        hasBankedThisRound: false
      }
    ]);
    expect(gameState.round).toEqual({
      currentRound: 1,
      bankTotal: 0,
      bankedPlayerIds: [],
      turnCountInRound: 0
    });
    expect(gameState.turn).toEqual({
      activePlayerIndex: 0,
      hasRolledThisTurn: false,
      lastRoll: null
    });
    expect(gameState.settings).toEqual({
      roundCount: 15,
      diceMode: "manual",
      theme: "light"
    });
    expect(gameState.status).toEqual({
      screen: "gameplay",
      isGameComplete: false,
      winnerIds: []
    });
  });
});
