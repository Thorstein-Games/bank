/**
 * Rule tests driven only through reducer actions (no hand-built mid-game
 * state), checked against SPEC.md sections 3–7.
 */
import type { GameState } from "@/game/models";
import { type GameAction, calculateWinnerIds, gameReducer } from "@/game/reducer";
import { createInitialGameState } from "@/state";

type Step =
  | [number, number]
  | { bank: string }
  | "advance";

function newGame(playerNames = ["Ann", "Ben", "Cat"], roundCount = 3): GameState {
  return createInitialGameState({
    playerNames,
    roundCount,
    diceMode: "built-in",
    theme: "system"
  });
}

function idOf(state: GameState, name: string): string {
  const player = state.players.find((candidate) => candidate.name === name);
  if (!player) throw new Error(`No player named ${name}`);
  return player.id;
}

// Rolls auto-advance like the UI does (a roll followed by advance-turn).
function play(state: GameState, steps: Step[]): GameState {
  return steps.reduce<GameState>((current, step) => {
    let action: GameAction;
    if (step === "advance") {
      action = { type: "advance-turn" };
    } else if (Array.isArray(step)) {
      const rolled = gameReducer(current, {
        type: "resolve-roll",
        dieOne: step[0],
        dieTwo: step[1]
      });
      return gameReducer(rolled, { type: "advance-turn" });
    } else {
      action = { type: "bank-player", playerId: idOf(current, step.bank) };
    }
    return gameReducer(current, action);
  }, state);
}

const activeName = (state: GameState) =>
  state.players[state.turn.activePlayerIndex].name;
const scoreOf = (state: GameState, name: string) =>
  state.players.find((player) => player.name === name)?.score;

describe("dice scoring (SPEC 4)", () => {
  it.each([
    [1, 2, 3],
    [2, 4, 6],
    [5, 6, 11],
    [6, 6, 12]
  ])("adds %i + %i = %i on the opening roll", (dieOne, dieTwo, expected) => {
    const next = gameReducer(newGame(), { type: "resolve-roll", dieOne, dieTwo });
    expect(next.round.bankTotal).toBe(expected);
  });

  it.each([
    [1, 6],
    [6, 1],
    [2, 5],
    [5, 2],
    [3, 4],
    [4, 3]
  ])("every 7 combination (%i, %i) adds 70 on each of the first three turns", (dieOne, dieTwo) => {
    let state = newGame();
    for (let turn = 1; turn <= 3; turn += 1) {
      state = play(state, [[dieOne, dieTwo]]);
      expect(state.round.bankTotal).toBe(70 * turn);
      expect(state.round.currentRound).toBe(1);
    }
  });

  it.each([
    [1, 6],
    [3, 4],
    [5, 2]
  ])("every 7 combination (%i, %i) busts from turn four on", (dieOne, dieTwo) => {
    const state = play(newGame(), [[2, 3], [2, 3], [2, 3], [dieOne, dieTwo]]);
    expect(state.round.currentRound).toBe(2);
    expect(state.round.bankTotal).toBe(0);
  });

  it("treats doubles in turns 1-3 as their face value", () => {
    const state = play(newGame(), [[1, 1], [3, 3], [6, 6]]);
    expect(state.round.bankTotal).toBe(2 + 6 + 12);
  });

  it("doubles the bank before adding the roll from turn four on", () => {
    // 4 + 5 + 6 = 15, then double 2s: 15 * 2 + 4 = 34, then double 1s: 34 * 2 + 2 = 70
    const state = play(newGame(), [[1, 3], [2, 3], [2, 4], [2, 2], [1, 1]]);
    expect(state.round.bankTotal).toBe(70);
  });

  it("an early 7 bonus is doubled by later doubles", () => {
    const state = play(newGame(), [[3, 4], [1, 2], [1, 2], [5, 5]]);
    expect(state.round.bankTotal).toBe((70 + 3 + 3) * 2 + 10);
  });

  it("records doubles and busts in the roll history", () => {
    const state = play(newGame(), [[1, 2], [4, 4], [3, 4], [5, 5], [6, 1]]);
    const [roundOne, roundTwo] = state.rollHistory;
    expect(roundOne.entries.map((entry) => [entry.total, entry.isDouble, entry.isBust])).toEqual([
      [3, false, false],
      [8, true, false],
      [7, false, false],
      [10, true, false],
      [7, false, true]
    ]);
    expect(roundOne.entries.map((entry) => entry.bankTotalAfterRoll)).toEqual([
      3, 11, 81, 172, 172
    ]);
    expect(roundOne.entries.map((entry) => entry.turnNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(roundTwo).toEqual({ roundNumber: 2, entries: [] });
  });
});

describe("turn order (SPEC 3.2)", () => {
  it("rotates through players in fixed order and wraps around", () => {
    let state = newGame();
    const order: string[] = [];
    for (let turn = 0; turn < 5; turn += 1) {
      order.push(activeName(state));
      state = play(state, [[1, 2]]);
    }
    expect(order).toEqual(["Ann", "Ben", "Cat", "Ann", "Ben"]);
  });

  it("does not advance the turn before the active player has rolled", () => {
    const state = gameReducer(newGame(), { type: "advance-turn" });
    expect(activeName(state)).toBe("Ann");
  });

  it("refuses a second roll in the same turn", () => {
    const rolled = gameReducer(newGame(), { type: "resolve-roll", dieOne: 2, dieTwo: 3 });
    expect(gameReducer(rolled, { type: "resolve-roll", dieOne: 6, dieTwo: 6 })).toBe(rolled);
  });

  it("moves straight to the next in-round player when the active player banks", () => {
    // After three rolls, Ann is active again.
    const state = play(newGame(), [[1, 2], [1, 2], [1, 2], { bank: "Ann" }]);
    expect(activeName(state)).toBe("Ben");
    expect(state.turn.hasRolledThisTurn).toBe(false);
  });

  it("does not change the active player when someone else banks", () => {
    const state = play(newGame(), [[1, 2], [1, 2], [1, 2], { bank: "Cat" }]);
    expect(activeName(state)).toBe("Ann");
  });

  it("skips banked players, wrapping past several in a row", () => {
    const state = play(newGame(["Ann", "Ben", "Cat", "Dan"]), [
      [1, 2],
      [1, 2],
      [1, 2],
      { bank: "Ann" },
      { bank: "Ben" },
      { bank: "Cat" }
    ]);
    expect(activeName(state)).toBe("Dan");
    const next = play(state, [[2, 3]]);
    // Dan is the only one left, so he keeps rolling.
    expect(activeName(next)).toBe("Dan");
    expect(next.round.bankTotal).toBe(9 + 5);
  });

  it("a banked player cannot roll", () => {
    const state = play(newGame(), [[1, 2], [1, 2], [1, 2], { bank: "Cat" }]);
    const forced: GameState = {
      ...state,
      turn: { ...state.turn, activePlayerIndex: 2 }
    };
    expect(gameReducer(forced, { type: "resolve-roll", dieOne: 1, dieTwo: 2 })).toBe(forced);
  });
});

describe("banking (SPEC 5)", () => {
  it("adds the current bank to the player and takes them out of the round", () => {
    const state = play(newGame(), [[2, 3], [2, 3], [2, 3], { bank: "Ben" }]);
    expect(scoreOf(state, "Ben")).toBe(15);
    expect(state.players.find((player) => player.name === "Ben")?.hasBankedThisRound).toBe(true);
    expect(state.round.bankedPlayerIds).toEqual([idOf(state, "Ben")]);
    // The communal bank is shared, not paid out.
    expect(state.round.bankTotal).toBe(15);
  });

  it("lets players bank the same pot or a larger one later", () => {
    const state = play(newGame(), [
      [2, 3],
      [2, 3],
      [2, 3],
      { bank: "Ann" },
      { bank: "Cat" },
      [4, 4]
    ]);
    // Ben rolled doubles after both banked: 15 * 2 + 8
    expect(state.round.bankTotal).toBe(38);
    const after = play(state, [{ bank: "Ben" }]);
    expect(scoreOf(after, "Ann")).toBe(15);
    expect(scoreOf(after, "Cat")).toBe(15);
    expect(scoreOf(after, "Ben")).toBe(38);
  });

  it("ignores a second bank by the same player", () => {
    const once = play(newGame(), [[2, 3], [2, 3], [2, 3], { bank: "Cat" }, [1, 2]]);
    const twice = play(once, [{ bank: "Cat" }]);
    expect(scoreOf(twice, "Cat")).toBe(15);
    expect(twice).toBe(once);
  });

  it("ignores banking for unknown players", () => {
    const state = play(newGame(), [[2, 3], [2, 3], [2, 3]]);
    expect(gameReducer(state, { type: "bank-player", playerId: "nobody" })).toBe(state);
  });

  it("is locked during the first three turns (in-app rule)", () => {
    const state = play(newGame(), [[2, 3], [2, 3]]);
    expect(play(state, [{ bank: "Ann" }])).toBe(state);
  });

  it("ignores banking an empty pot", () => {
    const state = play(newGame(), [[2, 3], [2, 3], [2, 3]]);
    const empty: GameState = { ...state, round: { ...state.round, bankTotal: 0 } };
    expect(play(empty, [{ bank: "Ann" }])).toBe(empty);
  });
});

describe("round flow (SPEC 4.3, 6)", () => {
  it("a bust gives unbanked players nothing and banked players keep their points", () => {
    const state = play(newGame(), [
      [5, 5],
      [5, 5],
      [5, 5],
      { bank: "Ben" },
      [6, 1]
    ]);
    expect(state.round.currentRound).toBe(2);
    expect(scoreOf(state, "Ann")).toBe(0);
    expect(scoreOf(state, "Ben")).toBe(30);
    expect(scoreOf(state, "Cat")).toBe(0);
  });

  it("starts the next round at 0 with everyone back in and no last roll", () => {
    const state = play(newGame(), [[5, 5], [5, 5], [5, 5], { bank: "Ben" }, [6, 1]]);
    expect(state.round).toEqual({
      currentRound: 2,
      bankTotal: 0,
      bankedPlayerIds: [],
      turnCountInRound: 0
    });
    expect(state.players.every((player) => !player.hasBankedThisRound)).toBe(true);
    expect(state.turn.lastRoll).toBeNull();
    expect(state.turn.hasRolledThisTurn).toBe(false);
  });

  it("the player after the one who busted opens the next round", () => {
    // Ann, Ben, Cat, Ann(bust) -> Ben opens round 2
    const state = play(newGame(), [[1, 2], [1, 2], [1, 2], [3, 4]]);
    expect(state.round.currentRound).toBe(2);
    expect(activeName(state)).toBe("Ben");
  });

  it("restarts the turn window each round, so 7 is a bonus again", () => {
    const state = play(newGame(), [[1, 2], [1, 2], [1, 2], [3, 4], [3, 4]]);
    expect(state.round.currentRound).toBe(2);
    expect(state.round.bankTotal).toBe(70);
  });

  it("ends the round once every player has banked", () => {
    const state = play(newGame(), [
      [2, 3],
      [2, 3],
      [2, 3],
      { bank: "Ann" },
      { bank: "Ben" },
      { bank: "Cat" }
    ]);
    expect(state.round.currentRound).toBe(2);
    expect(state.players.map((player) => player.score)).toEqual([15, 15, 15]);
  });

  it("carries scores across rounds", () => {
    const state = play(newGame(), [
      [2, 3], [2, 3], [2, 3], { bank: "Ann" }, [6, 1],
      [4, 4], [4, 4], [4, 4], { bank: "Ann" }, { bank: "Cat" }, [5, 2]
    ]);
    expect(state.round.currentRound).toBe(3);
    expect(scoreOf(state, "Ann")).toBe(15 + 24);
    expect(scoreOf(state, "Cat")).toBe(24);
    expect(scoreOf(state, "Ben")).toBe(0);
  });
});

describe("game end (SPEC 7, 17)", () => {
  function finalRoundBust(state: GameState): GameState {
    return play(state, [[1, 2], [1, 2], [1, 2], [3, 4]]);
  }

  it("ends after the configured number of rounds, not before", () => {
    let state = newGame(["Ann", "Ben"], 3);
    state = finalRoundBust(state);
    state = finalRoundBust(state);
    expect(state.status.isGameComplete).toBe(false);
    expect(state.round.currentRound).toBe(3);
    state = finalRoundBust(state);
    expect(state.status).toEqual({
      screen: "end-of-game",
      isGameComplete: true,
      winnerIds: [idOf(state, "Ann"), idOf(state, "Ben")]
    });
    expect(state.round.currentRound).toBe(3);
  });

  it("ends when everyone banks in the final round", () => {
    const state = play(newGame(["Ann", "Ben"], 1), [
      [2, 3], [2, 3], [2, 3], { bank: "Ann" }, [6, 6], { bank: "Ben" }
    ]);
    expect(state.status.isGameComplete).toBe(true);
    expect(state.status.winnerIds).toEqual([idOf(state, "Ben")]);
    expect(scoreOf(state, "Ann")).toBe(15);
    expect(scoreOf(state, "Ben")).toBe(15 * 2 + 12);
  });

  it("declares every tied leader a winner", () => {
    const state = play(newGame(["Ann", "Ben", "Cat"], 1), [
      [2, 3], [2, 3], [2, 3], { bank: "Ann" }, { bank: "Cat" }, [1, 6]
    ]);
    expect(state.status.winnerIds).toEqual([idOf(state, "Ann"), idOf(state, "Cat")]);
  });

  it("everyone ties at 0 when nobody ever banks", () => {
    const state = play(newGame(["Ann", "Ben"], 1), [[1, 2], [1, 2], [1, 2], [3, 4]]);
    expect(state.status.winnerIds).toEqual(state.players.map((player) => player.id));
  });

  it("ignores every action once the game is over", () => {
    const done = play(newGame(["Ann", "Ben"], 1), [[1, 2], [1, 2], [1, 2], [3, 4]]);
    expect(gameReducer(done, { type: "resolve-roll", dieOne: 2, dieTwo: 3 })).toBe(done);
    expect(gameReducer(done, { type: "bank-player", playerId: idOf(done, "Ann") })).toBe(done);
    expect(gameReducer(done, { type: "advance-turn" })).toBe(done);
  });

  it("supports the largest table (16 players)", () => {
    const names = Array.from({ length: 16 }, (_, index) => `P${index + 1}`);
    let state = newGame(names, 1);
    for (let turn = 0; turn < 16; turn += 1) {
      state = play(state, [[1, 2]]);
    }
    expect(activeName(state)).toBe("P1");
    expect(state.round.bankTotal).toBe(16 * 3);
  });
});

describe("guards", () => {
  it.each([
    [0, 3],
    [3, 0],
    [7, 1],
    [1, 7],
    [2.5, 3],
    [Number.NaN, 2],
    [-1, 4]
  ])("rejects invalid dice (%p, %p)", (dieOne, dieTwo) => {
    const state = newGame();
    expect(gameReducer(state, { type: "resolve-roll", dieOne, dieTwo })).toBe(state);
  });

  it("returns the same state for unknown actions", () => {
    const state = newGame();
    expect(gameReducer(state, { type: "nope" } as unknown as GameAction)).toBe(state);
  });

  it("does not mutate the previous state", () => {
    const state = newGame();
    const snapshot = JSON.parse(JSON.stringify(state));
    play(state, [[2, 3], [2, 3], [2, 3], { bank: "Ann" }, [6, 6], [1, 6]]);
    expect(state).toEqual(snapshot);
  });
});

describe("calculateWinnerIds", () => {
  it("returns no winners for no players", () => {
    expect(calculateWinnerIds([])).toEqual([]);
  });

  it("returns the single highest scorer", () => {
    const players = newGame().players.map((player, index) => ({
      ...player,
      score: [5, 50, 49][index]
    }));
    expect(calculateWinnerIds(players)).toEqual([players[1].id]);
  });
});
