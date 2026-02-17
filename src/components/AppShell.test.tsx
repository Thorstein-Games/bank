import { render, screen } from "@testing-library/react";
import AppShell from "./AppShell";

describe("AppShell", () => {
  it("renders setup UI without runtime errors", () => {
    render(<AppShell />);

    expect(screen.getByRole("heading", { name: "Setup" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start Game" })
    ).toBeDisabled();
  });
});
