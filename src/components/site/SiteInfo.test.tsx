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
  it("links back to Thorstein Games", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "More Games" })).toHaveAttribute(
      "href",
      "https://thorsteingames.com/",
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "https://thorsteingames.com/",
    );
  });
});
