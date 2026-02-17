import { rollDiceWithCrypto } from "../game/dice";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import AppShell from "./AppShell";

jest.mock("../game/dice", () => ({
  rollDiceWithCrypto: jest.fn()
}));

const mockedRollDiceWithCrypto = jest.mocked(rollDiceWithCrypto);

function startGameWithTwoPlayers(options?: { diceMode?: "built-in" | "manual" }) {
  fireEvent.change(screen.getByRole("textbox", { name: /Player 1/i }), {
    target: { value: "Alice" }
  });
  fireEvent.change(screen.getByRole("textbox", { name: /Player 2/i }), {
    target: { value: "Bob" }
  });

  if (options?.diceMode === "manual") {
    fireEvent.click(screen.getByRole("radio", { name: "Manual input" }));
  }

  fireEvent.click(screen.getByRole("button", { name: "Start Game" }));
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

describe("AppShell", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    mockedRollDiceWithCrypto.mockReset();
    mockedRollDiceWithCrypto.mockReturnValue({
      dieOne: 3,
      dieTwo: 4
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders setup UI without runtime errors", () => {
    render(<AppShell />);

    expect(screen.getByRole("heading", { name: "Setup" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start Game" })
    ).toBeDisabled();
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
});
