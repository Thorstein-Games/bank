import type { GameState } from "@/game/models";
import { calculateWinnerIds, gameReducer } from "@/game/reducer";
import { createInitialGameState } from "@/state";

function createGameState(playerNames = ["Alice", "Bob"], roundCount = 3): GameState {
  return createInitialGameState({
    playerNames,
    roundCount,
    diceMode: "built-in",
    theme: "system"
  });
}

describe("gameReducer - dice rules", () => {
  it("adds normal roll sum to communal bank", () => {
    const initialState = createGameState();

    const nextState = gameReducer(initialState, {
      type: "resolve-roll",
      dieOne: 3,
      dieTwo: 5
    });

    expect(nextState.round.bankTotal).toBe(8);
    expect(nextState.round.turnCountInRound).toBe(1);
    expect(nextState.turn.hasRolledThisTurn).toBe(true);
    expect(nextState.turn.lastRoll).toEqual({
      dieOne: 3,
      dieTwo: 5,
      total: 8,
      isDouble: false
    });
    expect(nextState.rollHistory).toEqual([
      {
        roundNumber: 1,
        entries: [
          {
            playerId: initialState.players[0].id,
            turnNumber: 1,
            dieOne: 3,
            dieTwo: 5,
            total: 8,
            isDouble: false,
            isBust: false,
            bankTotalAfterRoll: 8
          }
        ]
      }
    ]);
  });

  it("treats doubles as normal rolls during first three turns", () => {
    const initialState = createGameState();
    const preparedState: GameState = {
      ...initialState,
      round: {
        ...initialState.round,
        bankTotal: 12,
        turnCountInRound: 2
      }
    };

    const nextState = gameReducer(preparedState, {
      type: "resolve-roll",
      dieOne: 2,
      dieTwo: 2
    });

    expect(nextState.round.bankTotal).toBe(16);
  });

  it("doubles communal bank before adding sum on doubles after turn three", () => {
    const initialState = createGameState();
    const preparedState: GameState = {
      ...initialState,
      round: {
        ...initialState.round,
        bankTotal: 12,
        turnCountInRound: 3
      }
    };

    const nextState = gameReducer(preparedState, {
      type: "resolve-roll",
      dieOne: 4,
      dieTwo: 4
    });

    expect(nextState.round.bankTotal).toBe(32);
  });

  it("adds 70 to communal bank when rolling 7 during first three turns", () => {
    const initialState = createGameState();

    const nextState = gameReducer(initialState, {
      type: "resolve-roll",
      dieOne: 4,
      dieTwo: 3
    });

    expect(nextState.round.bankTotal).toBe(70);
    expect(nextState.round.turnCountInRound).toBe(1);
    expect(nextState.turn.hasRolledThisTurn).toBe(true);
  });

  it("busts after turn three and advances to next round immediately", () => {
    const initialState = createGameState(["Ada", "Grace"], 3);
    const preparedState: GameState = {
      ...initialState,
      players: [
        {
          ...initialState.players[0],
          score: 40,
          hasBankedThisRound: true
        },
        initialState.players[1]
      ],
      round: {
        ...initialState.round,
        bankTotal: 18,
        bankedPlayerIds: [initialState.players[0].id],
        turnCountInRound: 3
      },
      turn: {
        ...initialState.turn,
        activePlayerIndex: 1
      }
    };

    const nextState = gameReducer(preparedState, {
      type: "resolve-roll",
      dieOne: 2,
      dieTwo: 5
    });

    expect(nextState.round.currentRound).toBe(2);
    expect(nextState.round.bankTotal).toBe(0);
    expect(nextState.round.bankedPlayerIds).toEqual([]);
    expect(nextState.round.turnCountInRound).toBe(0);
    expect(nextState.players[0].score).toBe(40);
    expect(nextState.players[1].score).toBe(0);
    expect(nextState.players[0].hasBankedThisRound).toBe(false);
    expect(nextState.players[1].hasBankedThisRound).toBe(false);
    expect(nextState.turn.activePlayerIndex).toBe(0);
    expect(nextState.turn.hasRolledThisTurn).toBe(false);
    expect(nextState.rollHistory).toEqual([
      {
        roundNumber: 1,
        entries: [
          {
            playerId: preparedState.players[1].id,
            turnNumber: 4,
            dieOne: 2,
            dieTwo: 5,
            total: 7,
            isDouble: false,
            isBust: true,
            bankTotalAfterRoll: 18
          }
        ]
      },
      {
        roundNumber: 2,
        entries: []
      }
    ]);
  });
});

describe("gameReducer - banking and turn flow", () => {
  it("banks communal total into player score and marks player as banked", () => {
    const rolledState = gameReducer(createGameState(), {
      type: "resolve-roll",
      dieOne: 3,
      dieTwo: 3
    });
    const bankUnlockedState: GameState = {
      ...rolledState,
      round: {
        ...rolledState.round,
        turnCountInRound: 3
      }
    };

    const nextState = gameReducer(bankUnlockedState, {
      type: "bank-player",
      playerId: bankUnlockedState.players[1].id
    });

    expect(nextState.players[1].score).toBe(6);
    expect(nextState.players[1].hasBankedThisRound).toBe(true);
    expect(nextState.round.bankedPlayerIds).toEqual([
      bankUnlockedState.players[1].id
    ]);
    expect(nextState.turn.hasRolledThisTurn).toBe(true);
  });

  it("allows multiple players to bank once banking is unlocked", () => {
    const rolledState = gameReducer(createGameState(["A", "B", "C"]), {
      type: "resolve-roll",
      dieOne: 2,
      dieTwo: 4
    });
    const bankUnlockedState: GameState = {
      ...rolledState,
      round: {
        ...rolledState.round,
        turnCountInRound: 3
      }
    };

    const afterFirstBank = gameReducer(bankUnlockedState, {
      type: "bank-player",
      playerId: bankUnlockedState.players[0].id
    });
    const afterSecondBank = gameReducer(afterFirstBank, {
      type: "bank-player",
      playerId: bankUnlockedState.players[2].id
    });

    expect(afterSecondBank.players[0].score).toBe(6);
    expect(afterSecondBank.players[2].score).toBe(6);
    expect(afterSecondBank.round.bankedPlayerIds).toEqual([
      bankUnlockedState.players[0].id,
      bankUnlockedState.players[2].id
    ]);
    expect(afterSecondBank.turn.hasRolledThisTurn).toBe(false);
  });

  it("skips banked players when advancing turn order", () => {
    const rolledState = gameReducer(createGameState(["A", "B", "C"]), {
      type: "resolve-roll",
      dieOne: 1,
      dieTwo: 2
    });
    const bankUnlockedState: GameState = {
      ...rolledState,
      round: {
        ...rolledState.round,
        turnCountInRound: 3
      }
    };
    const bankedState = gameReducer(bankUnlockedState, {
      type: "bank-player",
      playerId: bankUnlockedState.players[1].id
    });

    const nextState = gameReducer(bankedState, {
      type: "advance-turn"
    });

    expect(nextState.turn.activePlayerIndex).toBe(2);
    expect(nextState.turn.hasRolledThisTurn).toBe(false);
  });

  it("allows banking after turn advances when communal bank is non-zero", () => {
    const rolledState = gameReducer(createGameState(["A", "B", "C"]), {
      type: "resolve-roll",
      dieOne: 2,
      dieTwo: 2
    });
    const bankUnlockedState: GameState = {
      ...rolledState,
      round: {
        ...rolledState.round,
        turnCountInRound: 3
      }
    };
    const advancedState = gameReducer(bankUnlockedState, {
      type: "advance-turn"
    });

    const nextState = gameReducer(advancedState, {
      type: "bank-player",
      playerId: advancedState.players[0].id
    });

    expect(nextState.players[0].score).toBe(4);
    expect(nextState.players[0].hasBankedThisRound).toBe(true);
    expect(nextState.round.bankedPlayerIds).toEqual([advancedState.players[0].id]);
  });

  it("advances turn when active player banks without rolling", () => {
    const initialState = createGameState(["A", "B", "C"]);
    const preparedState: GameState = {
      ...initialState,
      round: {
        ...initialState.round,
        turnCountInRound: 2
      }
    };
    const rolledState = gameReducer(preparedState, {
      type: "resolve-roll",
      dieOne: 2,
      dieTwo: 3
    });
    const advancedState = gameReducer(rolledState, {
      type: "advance-turn"
    });

    const nextState = gameReducer(advancedState, {
      type: "bank-player",
      playerId: advancedState.players[1].id
    });

    expect(nextState.players[1].score).toBe(5);
    expect(nextState.players[1].hasBankedThisRound).toBe(true);
    expect(nextState.turn.activePlayerIndex).toBe(2);
    expect(nextState.turn.hasRolledThisTurn).toBe(false);
  });

  it("resets round state when all players have banked", () => {
    const initialState = createGameState(["A", "B"], 2);
    const preparedState: GameState = {
      ...initialState,
      round: {
        ...initialState.round,
        turnCountInRound: 2
      }
    };
    const rolledState = gameReducer(preparedState, {
      type: "resolve-roll",
      dieOne: 3,
      dieTwo: 3
    });
    const afterFirstBank = gameReducer(rolledState, {
      type: "bank-player",
      playerId: rolledState.players[0].id
    });

    const nextState = gameReducer(afterFirstBank, {
      type: "bank-player",
      playerId: rolledState.players[1].id
    });

    expect(nextState.round.currentRound).toBe(2);
    expect(nextState.round.bankTotal).toBe(0);
    expect(nextState.round.bankedPlayerIds).toEqual([]);
    expect(nextState.round.turnCountInRound).toBe(0);
    expect(nextState.players[0].score).toBe(6);
    expect(nextState.players[1].score).toBe(6);
    expect(nextState.players[0].hasBankedThisRound).toBe(false);
    expect(nextState.players[1].hasBankedThisRound).toBe(false);
    expect(nextState.turn.hasRolledThisTurn).toBe(false);
  });
});

describe("gameReducer - completion and guardrails", () => {
  it("completes game and resolves tie winners in final round", () => {
    const initialState = createGameState(["A", "B"], 1);
    const preparedState: GameState = {
      ...initialState,
      players: initialState.players.map((player) => ({
        ...player,
        score: 20,
        hasBankedThisRound: true
      })),
      round: {
        ...initialState.round,
        currentRound: 1,
        bankedPlayerIds: initialState.players.map((player) => player.id),
        turnCountInRound: 4
      },
      turn: {
        ...initialState.turn,
        hasRolledThisTurn: true
      }
    };

    const nextState = gameReducer(preparedState, {
      type: "advance-turn"
    });

    expect(nextState.status.isGameComplete).toBe(true);
    expect(nextState.status.screen).toBe("end-of-game");
    expect(nextState.status.winnerIds).toEqual([
      initialState.players[0].id,
      initialState.players[1].id
    ]);
  });

  it("completes game after final-round bust and keeps highest scorer as winner", () => {
    const initialState = createGameState(["A", "B"], 1);
    const preparedState: GameState = {
      ...initialState,
      players: [
        {
          ...initialState.players[0],
          score: 30
        },
        {
          ...initialState.players[1],
          score: 5
        }
      ],
      round: {
        ...initialState.round,
        currentRound: 1,
        turnCountInRound: 3
      }
    };

    const nextState = gameReducer(preparedState, {
      type: "resolve-roll",
      dieOne: 3,
      dieTwo: 4
    });

    expect(nextState.status.isGameComplete).toBe(true);
    expect(nextState.status.winnerIds).toEqual([initialState.players[0].id]);
  });

  it("ignores banking before a roll, invalid dice values, and repeated roll actions", () => {
    const initialState = createGameState();

    const bankBeforeRoll = gameReducer(initialState, {
      type: "bank-player",
      playerId: initialState.players[0].id
    });
    const invalidRoll = gameReducer(initialState, {
      type: "resolve-roll",
      dieOne: 0,
      dieTwo: 7
    });
    const firstRoll = gameReducer(initialState, {
      type: "resolve-roll",
      dieOne: 1,
      dieTwo: 2
    });
    const repeatedRoll = gameReducer(firstRoll, {
      type: "resolve-roll",
      dieOne: 6,
      dieTwo: 6
    });

    expect(bankBeforeRoll).toEqual(initialState);
    expect(invalidRoll).toEqual(initialState);
    expect(repeatedRoll).toEqual(firstRoll);
  });

  it("ignores banking during the first three turns", () => {
    const rolledState = gameReducer(createGameState(), {
      type: "resolve-roll",
      dieOne: 1,
      dieTwo: 2
    });

    const bankDuringEarlyTurns = gameReducer(rolledState, {
      type: "bank-player",
      playerId: rolledState.players[0].id
    });

    expect(bankDuringEarlyTurns).toEqual(rolledState);
  });
});

describe("calculateWinnerIds", () => {
  it("returns all players tied for highest score", () => {
    const gameState = createGameState(["A", "B", "C"]);
    const players = [
      {
        ...gameState.players[0],
        score: 25
      },
      {
        ...gameState.players[1],
        score: 10
      },
      {
        ...gameState.players[2],
        score: 25
      }
    ];

    expect(calculateWinnerIds(players)).toEqual([
      gameState.players[0].id,
      gameState.players[2].id
    ]);
  });
});
