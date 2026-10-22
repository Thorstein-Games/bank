import type { GameState } from "@/game/models";
import { gameReducer } from "@/game/reducer";
import {
  buildRollResolutionFeedback,
  getDiceFromOutcome,
} from "@/hooks/useDiceRollController";
import { createInitialGameState } from "@/state";

function stateAt(turnCountInRound: number, bankTotal: number): GameState {
  const state = createInitialGameState({
    playerNames: ["Ann", "Ben"],
    roundCount: 5,
    diceMode: "built-in",
    theme: "system",
  });
  return { ...state, round: { ...state.round, turnCountInRound, bankTotal } };
}

const FACES = [1, 2, 3, 4, 5, 6];

describe("buildRollResolutionFeedback", () => {
  // The announcement is computed separately from the reducer; keep them in step.
  it.each([0, 2, 3, 6])(
    "matches the reducer for every roll at turn count %i",
    (turnCount) => {
      for (const dieOne of FACES) {
        for (const dieTwo of FACES) {
          const before = stateAt(turnCount, 40);
          const after = gameReducer(before, { type: "resolve-roll", dieOne, dieTwo });
          const feedback = buildRollResolutionFeedback(before, { dieOne, dieTwo });
          const busted = after.round.currentRound !== before.round.currentRound;

          expect(feedback.total).toBe(dieOne + dieTwo);
          expect(feedback.isBust).toBe(busted);
          if (!busted) {
            expect(feedback.nextBankTotal).toBe(after.round.bankTotal);
          }
        }
      }
    },
  );
});

describe("getDiceFromOutcome (manual mode)", () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])(
    "turns sum %i into two valid dice with that total",
    (sum) => {
      const { dieOne, dieTwo } = getDiceFromOutcome(sum);
      expect(dieOne + dieTwo).toBe(sum);
      expect(FACES).toContain(dieOne);
      expect(FACES).toContain(dieTwo);
    },
  );

  it("only the extremes (2 and 12) and 'doubles' produce doubles", () => {
    const doubleSums = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((sum) => {
      const { dieOne, dieTwo } = getDiceFromOutcome(sum);
      return dieOne === dieTwo;
    });
    expect(doubleSums).toEqual([2, 12]);
    expect(getDiceFromOutcome("doubles")).toEqual({ dieOne: 6, dieTwo: 6 });
  });
});
