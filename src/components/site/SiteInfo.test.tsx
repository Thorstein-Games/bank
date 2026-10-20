import { render, screen } from "@testing-library/react";
import { GAME_RULE_SECTIONS } from "@/game/rules";
import HowToPlay from "./HowToPlay";
import SiteFooter from "./SiteFooter";

describe("HowToPlay", () => {
  it("explains the game and lists every rule section", () => {
    render(<HowToPlay />);
    expect(
      screen.getByRole("heading", { name: "How to play Bank" }),
    ).toBeInTheDocument();
    for (const section of GAME_RULE_SECTIONS) {
      expect(
        screen.getByRole("heading", { name: section.title }),
      ).toBeInTheDocument();
    }
  });
});

describe("SiteFooter", () => {
  it("renders the shared Thorstein Games footer for Bank", () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelector("tg-footer")).toHaveAttribute("game", "bank");
  });
});
