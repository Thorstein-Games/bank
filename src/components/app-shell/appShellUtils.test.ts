import type { GameState, RoundRollHistory } from "@/game/models";
import { createInitialGameState } from "@/state";
import {
  buildEndGameStats,
  buildFinalStandings,
  buildRoundHistoryStats,
  buildSetupStateFromCompletedGame,
  buildWinnerAnnouncement,
  getWinnerNames,
  isShortcutInputTarget,
} from "./appShellUtils";

function game(roundCount = 10, diceMode: "built-in" | "manual" = "built-in"): GameState {
  return createInitialGameState({
    playerNames: ["Cat", "Ann", "Ben"],
    roundCount,
    diceMode,
    theme: "light",
  });
}

function entry(total: [number, number], opts: { bust?: boolean; bank: number }) {
  const [dieOne, dieTwo] = total;
  return {
    playerId: "player-1",
    turnNumber: 1,
    dieOne,
    dieTwo,
    total: dieOne + dieTwo,
    isDouble: dieOne === dieTwo,
    isBust: opts.bust ?? false,
    bankTotalAfterRoll: opts.bank,
  };
}

const HISTORY: RoundRollHistory[] = [
  {
    roundNumber: 1,
    entries: [
      entry([3, 4], { bank: 70 }),
      entry([2, 2], { bank: 74 }),
      entry([5, 5], { bank: 158 }),
      entry([6, 1], { bust: true, bank: 158 }),
    ],
  },
  { roundNumber: 2, entries: [entry([3, 4], { bank: 70 }), entry([1, 6], { bank: 140 })] },
  { roundNumber: 3, entries: [] },
];

describe("buildRoundHistoryStats", () => {
  it("counts busts, doubles, sevens and the peak bank per round", () => {
    const [one, two, three] = buildRoundHistoryStats(HISTORY);
    expect(one).toMatchObject({ bustCount: 1, doublesCount: 2, sevenCount: 2, maxBankAfterRoll: 158 });
    expect(two).toMatchObject({ bustCount: 0, doublesCount: 0, sevenCount: 2, maxBankAfterRoll: 140 });
    expect(three).toMatchObject({ bustCount: 0, doublesCount: 0, sevenCount: 0, maxBankAfterRoll: 0 });
  });
});

describe("buildEndGameStats", () => {
  it("summarises played rounds only", () => {
    const stats = buildEndGameStats(HISTORY);
    expect(stats.totalRolls).toBe(6);
    expect(stats.longestRoundTurns).toBe(4);
    expect(stats.maxBankPotential).toBe(158 + 140);
    expect(stats.averageTurnsPerRound).toBe(3);
    expect(stats.averageDoublesPerRound).toBe(1);
    expect(stats.bustRatePercent).toBeCloseTo(100 / 6);
    expect(stats.hottestNumber).toBe(7);
    expect(stats.numberProbabilities).toHaveLength(11);
    expect(stats.numberProbabilities.find((item) => item.total === 7)).toEqual({
      total: 7,
      count: 4,
      probabilityPercent: (4 / 6) * 100,
    });
    const percentSum = stats.numberProbabilities.reduce((sum, item) => sum + item.probabilityPercent, 0);
    expect(percentSum).toBeCloseTo(100);
  });

  it("is all zeros (and no hot number) before any roll", () => {
    const stats = buildEndGameStats([{ roundNumber: 1, entries: [] }]);
    expect(stats).toMatchObject({
      totalRolls: 0,
      maxBankPotential: 0,
      averageTurnsPerRound: 0,
      averageDoublesPerRound: 0,
      bustRatePercent: 0,
      hottestNumber: null,
      longestRoundTurns: 0,
    });
  });
});

describe("buildFinalStandings", () => {
  it("ranks by score, then by name for ties, without mutating players", () => {
    const state = game();
    state.players[0].score = 50; // Cat
    state.players[1].score = 80; // Ann
    state.players[2].score = 50; // Ben
    const original = state.players.map((player) => player.name);
    expect(buildFinalStandings(state).map((player) => player.name)).toEqual(["Ann", "Ben", "Cat"]);
    expect(state.players.map((player) => player.name)).toEqual(original);
  });
});

describe("winner helpers", () => {
  it("maps winner ids to names and skips unknown ids", () => {
    const state = game();
    state.status = { screen: "end-of-game", isGameComplete: true, winnerIds: ["player-2", "ghost", "player-3"] };
    expect(getWinnerNames(state)).toEqual(["Ann", "Ben"]);
  });

  it("announces a single winner, a tie, or nobody", () => {
    expect(buildWinnerAnnouncement(["Ann"])).toBe("Game complete. Winner: Ann.");
    expect(buildWinnerAnnouncement(["Ann", "Ben"])).toBe("Game complete. Winners: Ann, Ben.");
    expect(buildWinnerAnnouncement([])).toBe("Game complete. No winner recorded.");
  });
});

describe("buildSetupStateFromCompletedGame", () => {
  it("prefills names and a preset round count", () => {
    expect(buildSetupStateFromCompletedGame(game(15, "manual"))).toEqual({
      playerNames: ["Cat", "Ann", "Ben"],
      roundCountOption: 15,
      customRoundCount: "",
      diceMode: "manual",
      theme: "light",
    });
  });

  it("switches to custom for non-preset round counts", () => {
    expect(buildSetupStateFromCompletedGame(game(7))).toMatchObject({
      roundCountOption: "custom",
      customRoundCount: "7",
    });
  });
});

describe("isShortcutInputTarget", () => {
  it("ignores R/B shortcuts while typing", () => {
    expect(isShortcutInputTarget(document.createElement("input"))).toBe(true);
    expect(isShortcutInputTarget(document.createElement("textarea"))).toBe(true);
    expect(isShortcutInputTarget(document.createElement("select"))).toBe(true);
    expect(isShortcutInputTarget(document.createElement("button"))).toBe(false);
    expect(isShortcutInputTarget(null)).toBe(false);
  });
});
