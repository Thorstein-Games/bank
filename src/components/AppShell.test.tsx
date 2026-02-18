import { rollDiceWithCrypto } from "../game/dice";
import { createInitialGameState } from "@/state";
import {
  AUDIO_MUTED_STORAGE_KEY,
  GAME_SAVE_SCHEMA_VERSION,
  GAME_SAVE_STORAGE_KEY,
  THEME_PREFERENCE_STORAGE_KEY,
  type PersistedGameSnapshot,
} from "@/state/persistence";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import AppShell from "./AppShell";

jest.mock("../game/dice", () => ({
  rollDiceWithCrypto: jest.fn(),
}));

const mockedRollDiceWithCrypto = jest.mocked(rollDiceWithCrypto);

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

function openSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
}

function startGameWithPlayers(
  playerNames: string[],
  options?: {
    diceMode?: "built-in" | "manual";
    roundCount?: number;
  },
) {
  if (playerNames.length !== 2) {
    fireEvent.change(screen.getByRole("combobox", { name: "Player count" }), {
      target: { value: String(playerNames.length) },
    });
  }

  playerNames.forEach((playerName, index) => {
    fireEvent.change(
      screen.getByRole("textbox", {
        name: new RegExp(`Player ${index + 1}`, "i"),
      }),
      {
        target: { value: playerName },
      },
    );
  });

  if (options?.diceMode === "manual") {
    fireEvent.click(screen.getByRole("radio", { name: "Manual input" }));
  }

  if (typeof options?.roundCount === "number") {
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Custom round count" }),
      {
        target: { value: String(options.roundCount) },
      },
    );
  }

  fireEvent.click(screen.getByRole("button", { name: "Start Game" }));
}

function startGameWithTwoPlayers(options?: {
  diceMode?: "built-in" | "manual";
  roundCount?: number;
}) {
  startGameWithPlayers(["Alice", "Bob"], options);
}

function getPlayerRow(playerName: string): HTMLElement {
  const scoreboard = screen.getByRole("list", { name: "Scoreboard" });
  const row = within(scoreboard).getByText(playerName).closest("li");
  if (!row) {
    throw new Error(`Could not find scoreboard row for ${playerName}.`);
  }

  return row;
}

function completeBuiltInRollAnimation() {
  act(() => {
    jest.advanceTimersByTime(800);
  });
}

function completeAutoAdvanceDelay() {
  act(() => {
    jest.advanceTimersByTime(300);
  });
}

function bankPlayer(playerName: string) {
  fireEvent.click(
    screen.getByRole("button", { name: new RegExp(`^${playerName}\\b`) }),
  );
}

function persistSnapshot(snapshot: PersistedGameSnapshot) {
  window.localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify(snapshot));
}

describe("AppShell", () => {
  let confirmSpy: jest.SpiedFunction<typeof window.confirm>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockMatchMedia(false);
    window.localStorage.clear();
    mockedRollDiceWithCrypto.mockReset();
    mockedRollDiceWithCrypto.mockReturnValue({
      dieOne: 3,
      dieTwo: 4,
    });
    confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    confirmSpy.mockRestore();
  });

  it("renders setup UI without runtime errors", () => {
    render(<AppShell />);

    expect(screen.getByRole("heading", { name: "Setup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Game" })).toBeDisabled();
  });

  it("uses one primary h1 that includes the target SEO phrase", () => {
    render(<AppShell />);

    const primaryHeadings = screen.getAllByRole("heading", { level: 1 });
    expect(primaryHeadings).toHaveLength(1);
    expect(primaryHeadings[0]).toHaveTextContent("Play Bank Dice Game Online");
  });

  it("delays built-in roll commit until animation completes", () => {
    render(<AppShell />);
    startGameWithTwoPlayers();

    const rollButton = screen.getByRole("button", { name: "Roll" });
    const aliceBankButton = screen.getByRole("button", { name: /^Alice\b/ });
    const bobBankButton = screen.getByRole("button", { name: /^Bob\b/ });
    const bankTotal = screen.getByTestId("communal-bank-total");

    expect(rollButton).toBeEnabled();
    expect(aliceBankButton).toBeDisabled();
    expect(bobBankButton).toBeDisabled();
    expect(bankTotal).toHaveTextContent("0");

    fireEvent.click(rollButton);

    expect(screen.getByRole("button", { name: "Rolling..." })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Rolling..." }),
    ).toBeInTheDocument();
    expect(aliceBankButton).toBeDisabled();
    expect(bankTotal).toHaveTextContent("0");

    act(() => {
      jest.advanceTimersByTime(799);
    });
    expect(bankTotal).toHaveTextContent("0");
    expect(aliceBankButton).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(screen.getByRole("button", { name: "Roll" })).toBeDisabled();
    expect(aliceBankButton).toBeEnabled();
    expect(bobBankButton).toBeEnabled();
    expect(bankTotal).toHaveTextContent("70");

    completeAutoAdvanceDelay();
    expect(screen.getByRole("button", { name: "Roll" })).toBeEnabled();
  });

  it("completes a built-in full game flow with three players", () => {
    render(<AppShell />);
    startGameWithPlayers(["Alice", "Bob", "Carla"], { roundCount: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    completeBuiltInRollAnimation();

    bankPlayer("Alice");
    bankPlayer("Bob");
    bankPlayer("Carla");

    expect(
      screen.getByRole("heading", { name: "End of Game" }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("list", { name: "Final scoreboard" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(3);
  });

  it("supports gameplay keyboard shortcuts for rolling and banking", () => {
    render(<AppShell />);
    startGameWithTwoPlayers();

    fireEvent.keyDown(window, { key: "r" });
    expect(
      screen.getByRole("button", { name: "Rolling..." }),
    ).toBeInTheDocument();

    completeBuiltInRollAnimation();
    fireEvent.keyDown(window, { key: "b" });

    expect(
      within(getPlayerRow("Alice")).getByText("Score 70"),
    ).toBeInTheDocument();
  });

  it("skips built-in animation when reduced motion is preferred", () => {
    mockMatchMedia(true);
    render(<AppShell />);
    startGameWithTwoPlayers();

    fireEvent.click(screen.getByRole("button", { name: "Roll" }));

    expect(
      screen.queryByRole("button", { name: "Rolling..." }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Alice\b/ })).toBeEnabled();
    expect(screen.getByTestId("communal-bank-total")).toHaveTextContent("70");
  });

  it("highlights active player and auto-advances after rolling", () => {
    render(<AppShell />);
    startGameWithTwoPlayers();

    expect(getPlayerRow("Alice")).toHaveAttribute("aria-current", "true");
    expect(getPlayerRow("Bob")).not.toHaveAttribute("aria-current");

    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    completeBuiltInRollAnimation();
    completeAutoAdvanceDelay();

    expect(getPlayerRow("Alice")).not.toHaveAttribute("aria-current");
    expect(getPlayerRow("Bob")).toHaveAttribute("aria-current", "true");
  });

  it("shows a resume prompt and hydrates pending roll without replaying animation", () => {
    persistSnapshot({
      schemaVersion: GAME_SAVE_SCHEMA_VERSION,
      gameState: createInitialGameState({
        playerNames: ["Alice", "Bob"],
        roundCount: 10,
        diceMode: "built-in",
        theme: "system",
      }),
      pendingRoll: {
        dieOne: 3,
        dieTwo: 4,
      },
    });

    render(<AppShell />);

    expect(
      screen.getByText(
        "Saved game found. Resume where you left off or start a new game.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resume Game" }));

    expect(screen.queryByText("Rolling dice...")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Die one: 3" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Die two: 4" })).toBeInTheDocument();
    expect(screen.getByTestId("communal-bank-total")).toHaveTextContent("70");
    expect(screen.getByRole("button", { name: /^Alice\b/ })).toBeEnabled();
  });

  it("falls back to setup when saved schema is incompatible", () => {
    const incompatibleSnapshot = {
      schemaVersion: GAME_SAVE_SCHEMA_VERSION + 1,
      gameState: createInitialGameState({
        playerNames: ["Alice", "Bob"],
        roundCount: 10,
        diceMode: "built-in",
        theme: "system",
      }),
      pendingRoll: null,
    };
    window.localStorage.setItem(
      GAME_SAVE_STORAGE_KEY,
      JSON.stringify(incompatibleSnapshot),
    );

    render(<AppShell />);

    expect(
      screen.queryByRole("button", { name: "Resume Game" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Setup" })).toBeInTheDocument();
    expect(window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBeNull();
  });

  it("starts a new game from setup and clears saved run from the resume prompt", () => {
    persistSnapshot({
      schemaVersion: GAME_SAVE_SCHEMA_VERSION,
      gameState: createInitialGameState({
        playerNames: ["Alice", "Bob"],
        roundCount: 10,
        diceMode: "built-in",
        theme: "system",
      }),
      pendingRoll: null,
    });

    render(<AppShell />);

    fireEvent.click(screen.getByRole("button", { name: "New Game" }));

    expect(screen.getByRole("heading", { name: "Setup" })).toBeInTheDocument();
    expect(window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBeNull();
  });

  it("requires confirmation before resetting saved game data", () => {
    persistSnapshot({
      schemaVersion: GAME_SAVE_SCHEMA_VERSION,
      gameState: createInitialGameState({
        playerNames: ["Alice", "Bob"],
        roundCount: 10,
        diceMode: "built-in",
        theme: "system",
      }),
      pendingRoll: null,
    });
    render(<AppShell />);

    openSettings();

    confirmSpy.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Reset Saved Game" }));
    expect(window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)).not.toBeNull();

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Reset Saved Game" }));
    expect(window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBeNull();
  });

  it("persists theme override and applies theme immediately", () => {
    render(<AppShell />);

    expect(document.documentElement).not.toHaveAttribute("data-theme");

    openSettings();
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).toBe(
      JSON.stringify("dark"),
    );

    fireEvent.click(screen.getByRole("radio", { name: "System" }));
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(
      window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY),
    ).toBeNull();
  });

  it("persists mute preference and toggles global audio state", () => {
    render(<AppShell />);

    openSettings();
    const muteButton = screen.getByRole("button", { name: "Mute Audio" });
    fireEvent.click(muteButton);

    expect(window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY)).toBe(
      JSON.stringify(true),
    );
    expect(
      screen.getByRole("button", { name: "Unmute Audio" }),
    ).toBeInTheDocument();
  });

  it("shows gameplay settings button and keeps configured round count", () => {
    render(<AppShell />);
    startGameWithTwoPlayers({
      diceMode: "manual",
      roundCount: 12,
    });

    expect(screen.getByText("Round 1 of 12")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("expands and collapses the rules section in settings", () => {
    render(<AppShell />);

    openSettings();

    const rulesDetails = screen.getByTestId("setup-rules");
    expect(rulesDetails).not.toHaveAttribute("open");

    fireEvent.click(screen.getByText("Rules"));

    expect(rulesDetails).toHaveAttribute("open");
    expect(screen.getByText("Round Flow")).toBeInTheDocument();
  });
});
