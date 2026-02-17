import { fireEvent, render, screen } from "@testing-library/react";
import AppShell from "./AppShell";

function startGameWithTwoPlayers() {
  fireEvent.change(screen.getByRole("textbox", { name: /Player 1/i }), {
    target: { value: "Alice" }
  });
  fireEvent.change(screen.getByRole("textbox", { name: /Player 2/i }), {
    target: { value: "Bob" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Start Game" }));
}

function getPlayerRow(playerName: string): HTMLElement {
  const row = screen.getByText(playerName).closest("li");
  if (!row) {
    throw new Error(`Could not find scoreboard row for ${playerName}.`);
  }

  return row;
}

describe("AppShell", () => {
  it("renders setup UI without runtime errors", () => {
    render(<AppShell />);

    expect(screen.getByRole("heading", { name: "Setup" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start Game" })
    ).toBeDisabled();
  });

  it("toggles roll and bank states around a turn roll", () => {
    render(<AppShell />);
    startGameWithTwoPlayers();

    const rollButton = screen.getByRole("button", { name: "Roll" });
    const bankButton = screen.getByRole("button", { name: "Bank" });
    const bankTotal = screen.getByTestId("communal-bank-total");

    expect(rollButton).toBeEnabled();
    expect(bankButton).toBeDisabled();
    expect(bankTotal).toHaveTextContent("0");

    fireEvent.click(rollButton);

    expect(rollButton).toBeDisabled();
    expect(bankButton).toBeEnabled();
    expect(bankTotal).not.toHaveTextContent(/^0$/);
    expect(screen.getByRole("button", { name: "Continue Turn" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Bank Alice" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Bank Bob" })).toBeEnabled();
  });

  it("highlights active player and moves highlight after continuing turn", () => {
    render(<AppShell />);
    startGameWithTwoPlayers();

    expect(getPlayerRow("Alice")).toHaveAttribute("aria-current", "true");
    expect(getPlayerRow("Bob")).not.toHaveAttribute("aria-current");

    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue Turn" }));

    expect(getPlayerRow("Alice")).not.toHaveAttribute("aria-current");
    expect(getPlayerRow("Bob")).toHaveAttribute("aria-current", "true");
  });
});
