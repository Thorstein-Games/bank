import { rollDiceWithCrypto } from "../game/dice";
import { createInitialGameState } from "@/state";
import {
  AUDIO_MUTED_STORAGE_KEY,
  GAME_SAVE_SCHEMA_VERSION,
  GAME_SAVE_STORAGE_KEY,
  THEME_PREFERENCE_STORAGE_KEY,
  type PersistedGameSnapshot
} from "@/state/persistence";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import AppShell from "./AppShell";

jest.mock("../game/dice", () => ({
  rollDiceWithCrypto: jest.fn()
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
      dispatchEvent: jest.fn()
    }))
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
  }
) {
  if (playerNames.length !== 2) {
    fireEvent.change(screen.getByRole("combobox", { name: "Player count" }), {
      target: { value: String(playerNames.length) }
    });
  }

  playerNames.forEach((playerName, index) => {
    fireEvent.change(
      screen.getByRole("textbox", { name: new RegExp(`Player ${index + 1}`, "i") }),
      {
        target: { value: playerName }
      }
    );
  });

  if (options?.diceMode === "manual" || typeof options?.roundCount === "number") {
    openSettings();
  }

  if (options?.diceMode === "manual") {
    fireEvent.click(screen.getByRole("radio", { name: "Manual input" }));
  }

  if (typeof options?.roundCount === "number") {
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Custom round count" }), {
      target: { value: String(options.roundCount) }
    });
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
      dieTwo: 4
    });
    confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    confirmSpy.mockRestore();
  });

  it("renders setup UI without runtime errors", () => {
    render(<AppShell />);

    expect(screen.getByRole("heading", { name: "Setup" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start Game" })
    ).toBeDisabled();
  });

  it("uses one primary h1 that includes the target SEO phrase", () => {
    render(<AppShell />);

    const primaryHeadings = screen.getAllByRole("heading", { level: 1 });
    expect(primaryHeadings).toHaveLength(1);
    expect(primaryHeadings[0]).toHaveTextContent("Play bank game online");
  });

  it("delays built-in roll commit until animation completes", () => {
    render(<AppShell />);
    startGameWithTwoPlayers();

    const rollButton = screen.getByRole("button", { name: "Roll" });
    const bankButton = screen.getByRole("button", { name: "Bank" });
    const bankTotal = screen.getByTestId("communal-bank-total");

    expect(rollButton).toBeEnabled();
    expect(bankButton).toBeDisabled();
    expect(bankTotal).toHaveTextContent("0");

    fireEvent.click(rollButton);

    expect(screen.getByRole("button", { name: "Rolling..." })).toBeDisabled();
    expect(screen.getByText("Rolling dice...")).toBeInTheDocument();
    expect(bankButton).toBeDisabled();
    expect(bankTotal).toHaveTextContent("0");

    act(() => {
      jest.advanceTimersByTime(799);
    });
    expect(bankTotal).toHaveTextContent("0");
    expect(bankButton).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(screen.getByRole("button", { name: "Roll" })).toBeDisabled();
    expect(bankButton).toBeEnabled();
    expect(bankTotal).toHaveTextContent("70");
    expect(screen.getByRole("button", { name: "Continue Turn" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Bank Alice" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Bank Bob" })).toBeEnabled();
  });

  it("bypasses animation in manual mode and blocks invalid input", () => {
    render(<AppShell />);
    startGameWithTwoPlayers({ diceMode: "manual" });

    const dieOneInput = screen.getByRole("spinbutton", { name: "Die one" });
    const dieTwoInput = screen.getByRole("spinbutton", { name: "Die two" });
    const rollButton = screen.getByRole("button", { name: "Roll" });
    const bankButton = screen.getByRole("button", { name: "Bank" });
    const bankTotal = screen.getByTestId("communal-bank-total");

    fireEvent.change(dieOneInput, { target: { value: "9" } });
    fireEvent.change(dieTwoInput, { target: { value: "2" } });

    expect(
      screen.getByText("Enter both dice as whole numbers from 1 to 6.")
    ).toBeInTheDocument();
    expect(rollButton).toBeDisabled();
    expect(bankTotal).toHaveTextContent("0");

    fireEvent.change(dieOneInput, { target: { value: "3" } });
    fireEvent.change(dieTwoInput, { target: { value: "4" } });

    expect(rollButton).toBeEnabled();

    fireEvent.click(rollButton);

    expect(screen.queryByText("Rolling dice...")).not.toBeInTheDocument();
    expect(bankTotal).toHaveTextContent("70");
    expect(bankButton).toBeEnabled();
  });

  it("completes a built-in full game flow with three players", () => {
    render(<AppShell />);
    startGameWithPlayers(["Alice", "Bob", "Carla"], { roundCount: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    completeBuiltInRollAnimation();

    fireEvent.click(screen.getByRole("button", { name: "Bank Alice" }));
    fireEvent.click(screen.getByRole("button", { name: "Bank Bob" }));
    fireEvent.click(screen.getByRole("button", { name: "Bank Carla" }));

    expect(screen.getByRole("heading", { name: "End of Game" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Final scoreboard" })).getAllByRole(
        "listitem"
      )
    ).toHaveLength(3);
  });

  it("completes a manual full game flow with four players", () => {
    render(<AppShell />);
    startGameWithPlayers(["Alice", "Bob", "Carla", "Dina"], {
      diceMode: "manual",
      roundCount: 1
    });

    fireEvent.change(screen.getByRole("spinbutton", { name: "Die one" }), {
      target: { value: "3" }
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Die two" }), {
      target: { value: "4" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Roll" }));

    fireEvent.click(screen.getByRole("button", { name: "Bank Alice" }));
    fireEvent.click(screen.getByRole("button", { name: "Bank Bob" }));
    fireEvent.click(screen.getByRole("button", { name: "Bank Carla" }));
    fireEvent.click(screen.getByRole("button", { name: "Bank Dina" }));

    expect(screen.getByRole("heading", { name: "End of Game" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Final scoreboard" })).getAllByRole(
        "listitem"
      )
    ).toHaveLength(4);
  });

  it("supports gameplay keyboard shortcuts for rolling and banking", () => {
    render(<AppShell />);
    startGameWithTwoPlayers();

    fireEvent.keyDown(window, { key: "r" });
    expect(screen.getByRole("button", { name: "Rolling..." })).toBeInTheDocument();

    completeBuiltInRollAnimation();
    fireEvent.keyDown(window, { key: "b" });

    expect(within(getPlayerRow("Alice")).getByText("Score 70")).toBeInTheDocument();
  });

  it("skips built-in animation when reduced motion is preferred", () => {
    mockMatchMedia(true);
    render(<AppShell />);
    startGameWithTwoPlayers();

    fireEvent.click(screen.getByRole("button", { name: "Roll" }));

    expect(screen.queryByRole("button", { name: "Rolling..." })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bank" })).toBeEnabled();
    expect(screen.getByTestId("communal-bank-total")).toHaveTextContent("70");
  });

  it("highlights active player and moves highlight after continuing turn", () => {
    render(<AppShell />);
    startGameWithTwoPlayers();

    expect(getPlayerRow("Alice")).toHaveAttribute("aria-current", "true");
    expect(getPlayerRow("Bob")).not.toHaveAttribute("aria-current");

    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    completeBuiltInRollAnimation();
    fireEvent.click(screen.getByRole("button", { name: "Continue Turn" }));

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
        theme: "system"
      }),
      pendingRoll: {
        dieOne: 3,
        dieTwo: 4
      }
    });

    render(<AppShell />);

    expect(
      screen.getByText("Saved game found. Resume where you left off or start a new game.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resume Game" }));

    expect(screen.queryByText("Rolling dice...")).not.toBeInTheDocument();
    expect(screen.getByText("Dice showing 3 and 4.")).toBeInTheDocument();
    expect(screen.getByTestId("communal-bank-total")).toHaveTextContent("70");
    expect(screen.getByRole("button", { name: "Bank" })).toBeEnabled();
  });

  it("falls back to setup when saved schema is incompatible", () => {
    const incompatibleSnapshot = {
      schemaVersion: GAME_SAVE_SCHEMA_VERSION + 1,
      gameState: createInitialGameState({
        playerNames: ["Alice", "Bob"],
        roundCount: 10,
        diceMode: "built-in",
        theme: "system"
      }),
      pendingRoll: null
    };
    window.localStorage.setItem(
      GAME_SAVE_STORAGE_KEY,
      JSON.stringify(incompatibleSnapshot)
    );

    render(<AppShell />);

    expect(screen.queryByRole("button", { name: "Resume Game" })).not.toBeInTheDocument();
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
        theme: "system"
      }),
      pendingRoll: null
    });

    render(<AppShell />);

    fireEvent.click(screen.getByRole("button", { name: "New Game" }));

    expect(screen.getByRole("heading", { name: "Setup" })).toBeInTheDocument();
    expect(window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBeNull();
  });

  it("requires confirmation before resetting saved game data", () => {
    render(<AppShell />);
    startGameWithTwoPlayers();

    expect(window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

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
      JSON.stringify("dark")
    );

    fireEvent.click(screen.getByRole("radio", { name: "System" }));
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).toBeNull();
  });

  it("persists mute preference and toggles global audio state", () => {
    render(<AppShell />);

    const muteButton = screen.getByRole("button", { name: "Mute Audio" });
    fireEvent.click(muteButton);

    expect(window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY)).toBe(
      JSON.stringify(true)
    );
    expect(screen.getByRole("button", { name: "Unmute Audio" })).toBeInTheDocument();
  });

  it("locks dice mode during gameplay and keeps configured round count", () => {
    render(<AppShell />);
    startGameWithTwoPlayers({
      diceMode: "manual",
      roundCount: 12
    });

    expect(screen.getByText("Round 1 of 12")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Manual dice input" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByText(/Dice mode is locked for this game:/i)).toHaveTextContent(
      "manual"
    );
    expect(
      screen.getByText(/Configured rounds for this game:/i)
    ).toHaveTextContent("12");
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

  it("resets rounds and scores on play again while preserving player names", () => {
    render(<AppShell />);
    startGameWithTwoPlayers({
      diceMode: "manual",
      roundCount: 1
    });

    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    fireEvent.click(screen.getByRole("button", { name: "Bank Alice" }));
    fireEvent.click(screen.getByRole("button", { name: "Bank Bob" }));

    expect(screen.getByRole("heading", { name: "End of Game" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Play Again" }));

    expect(screen.getByRole("heading", { name: "Gameplay" })).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 1")).toBeInTheDocument();
    expect(within(getPlayerRow("Alice")).getByText("Score 0")).toBeInTheDocument();
    expect(within(getPlayerRow("Bob")).getByText("Score 0")).toBeInTheDocument();
  });

  it("announces roll, bank, and winner updates via live regions", () => {
    render(<AppShell />);
    startGameWithTwoPlayers({
      diceMode: "manual",
      roundCount: 1
    });

    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    expect(screen.getByText(/Alice rolled 1 and 1 for 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Bank Alice" }));
    expect(screen.getByText(/Alice banked 2. New score: 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Bank Bob" }));
    expect(screen.getByText(/Game complete. Winners: Alice, Bob./i)).toBeInTheDocument();
  });
});
