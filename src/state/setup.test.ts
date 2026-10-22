import {
  CUSTOM_ROUND_COUNT,
  buildSetupConfig,
  createDefaultSetupState,
  resizePlayerNames,
  resolveRoundCount,
  validateSetup,
  type SetupState,
} from "@/state";

function setup(overrides: Partial<SetupState> = {}): SetupState {
  return { ...createDefaultSetupState(), playerNames: ["Ann", "Ben"], ...overrides };
}

describe("createDefaultSetupState", () => {
  it("starts with two blank players, 10 rounds, built-in dice, system theme", () => {
    expect(createDefaultSetupState()).toEqual({
      playerNames: ["", ""],
      roundCountOption: 10,
      customRoundCount: "",
      diceMode: "built-in",
      theme: "system",
    });
  });

  it("is invalid until names are entered", () => {
    expect(validateSetup(createDefaultSetupState()).isValid).toBe(false);
  });
});

describe("resizePlayerNames", () => {
  it("adds blank seats and keeps existing names", () => {
    expect(resizePlayerNames(["Ann", "Ben"], 4)).toEqual(["Ann", "Ben", "", ""]);
  });

  it("removes seats from the end", () => {
    expect(resizePlayerNames(["Ann", "Ben", "Cat", "Dan"], 3)).toEqual(["Ann", "Ben", "Cat"]);
  });

  it("clamps to 2-16 players", () => {
    expect(resizePlayerNames(["Ann", "Ben", "Cat"], 1)).toEqual(["Ann", "Ben"]);
    expect(resizePlayerNames(["Ann", "Ben", "Cat"], 0)).toEqual(["Ann", "Ben"]);
    expect(resizePlayerNames(["Ann"], 40)).toHaveLength(16);
  });
});

describe("resolveRoundCount", () => {
  it.each([10, 15, 20] as const)("uses the %i-round preset as is", (preset) => {
    expect(resolveRoundCount(preset, "999")).toBe(preset);
  });

  it.each([
    ["1", 1],
    ["7", 7],
    [" 12 ", 12],
    ["100", 100],
  ])("accepts custom %p", (value, expected) => {
    expect(resolveRoundCount(CUSTOM_ROUND_COUNT, value)).toBe(expected);
  });

  it.each(["", "   ", "0", "-3", "abc", "2.5", "3rounds", "1e"])(
    "rejects custom %p",
    (value) => {
      expect(resolveRoundCount(CUSTOM_ROUND_COUNT, value)).toBeNull();
    },
  );
});

describe("validateSetup", () => {
  it("accepts 2 and 16 uniquely named players", () => {
    expect(validateSetup(setup()).isValid).toBe(true);
    const sixteen = Array.from({ length: 16 }, (_, index) => `P${index}`);
    expect(validateSetup(setup({ playerNames: sixteen })).isValid).toBe(true);
  });

  it("rejects fewer than 2 or more than 16 players", () => {
    const one = validateSetup(setup({ playerNames: ["Solo"] }));
    expect(one.isValid).toBe(false);
    expect(one.playerCountError).toBe("At least 2 players are required.");

    const seventeen = Array.from({ length: 17 }, (_, index) => `P${index}`);
    const many = validateSetup(setup({ playerNames: seventeen }));
    expect(many.isValid).toBe(false);
    expect(many.playerCountError).toBe("A maximum of 16 players are allowed.");
  });

  it("treats whitespace-only names as empty", () => {
    const result = validateSetup(setup({ playerNames: ["Ann", "   "] }));
    expect(result.isValid).toBe(false);
    expect(result.playerErrors).toEqual([null, "Name is required."]);
  });

  it("flags duplicates ignoring case and surrounding spaces, on every copy", () => {
    const result = validateSetup(setup({ playerNames: ["Ann", " ann ", "Ben", "ANN"] }));
    expect(result.isValid).toBe(false);
    expect(result.playerErrors).toEqual([
      "Name must be unique.",
      "Name must be unique.",
      null,
      "Name must be unique.",
    ]);
  });

  it("reports a bad custom round count", () => {
    const result = validateSetup(
      setup({ roundCountOption: CUSTOM_ROUND_COUNT, customRoundCount: "0" }),
    );
    expect(result.isValid).toBe(false);
    expect(result.roundCountError).toBe(
      "Custom rounds must be a whole number greater than 0.",
    );
  });
});

describe("buildSetupConfig", () => {
  it("returns null for an invalid setup", () => {
    expect(buildSetupConfig(setup({ playerNames: ["Ann", "ann"] }))).toBeNull();
    expect(
      buildSetupConfig(setup({ roundCountOption: CUSTOM_ROUND_COUNT, customRoundCount: "" })),
    ).toBeNull();
  });

  it("trims names and resolves a custom round count", () => {
    expect(
      buildSetupConfig(
        setup({
          playerNames: ["  Ann ", "Ben  "],
          roundCountOption: CUSTOM_ROUND_COUNT,
          customRoundCount: "3",
          diceMode: "manual",
          theme: "dark",
        }),
      ),
    ).toEqual({ playerNames: ["Ann", "Ben"], roundCount: 3, diceMode: "manual", theme: "dark" });
  });
});
