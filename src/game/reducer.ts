import {
  BUST_TOTAL,
  DIE_MAX,
  DIE_MIN,
  EARLY_SEVEN_BONUS,
  EARLY_TURN_WINDOW
} from "@/game/constants";
import type { DiceRoll, GameState, Player } from "@/game/models";

export type GameAction =
  | {
      type: "resolve-roll";
      dieOne: number;
      dieTwo: number;
    }
  | {
      type: "bank-player";
      playerId: string;
    }
  | {
      type: "advance-turn";
    };

interface RollOutcome {
  nextBankTotal: number;
  isBust: boolean;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.status.isGameComplete) {
    return state;
  }

  switch (action.type) {
    case "resolve-roll":
      return handleResolveRoll(state, action.dieOne, action.dieTwo);
    case "bank-player":
      return handleBankPlayer(state, action.playerId);
    case "advance-turn":
      return handleAdvanceTurn(state);
    default:
      return state;
  }
}

export function calculateWinnerIds(players: Player[]): string[] {
  if (players.length === 0) {
    return [];
  }

  const highestScore = players.reduce(
    (maxScore, player) => Math.max(maxScore, player.score),
    Number.NEGATIVE_INFINITY
  );
  return players
    .filter((player) => player.score === highestScore)
    .map((player) => player.id);
}

function handleResolveRoll(
  state: GameState,
  dieOne: number,
  dieTwo: number
): GameState {
  if (state.turn.hasRolledThisTurn) {
    return state;
  }

  if (!isValidDieValue(dieOne) || !isValidDieValue(dieTwo)) {
    return state;
  }

  const activePlayer = state.players[state.turn.activePlayerIndex];
  if (!activePlayer || activePlayer.hasBankedThisRound) {
    return state;
  }

  const roll = buildDiceRoll(dieOne, dieTwo);
  const isEarlyTurn = state.round.turnCountInRound < EARLY_TURN_WINDOW;
  const outcome = resolveRollOutcome(state.round.bankTotal, roll, isEarlyTurn);

  const rolledState: GameState = {
    ...state,
    round: {
      ...state.round,
      bankTotal: outcome.nextBankTotal,
      turnCountInRound: state.round.turnCountInRound + 1
    },
    turn: {
      ...state.turn,
      hasRolledThisTurn: !outcome.isBust,
      lastRoll: roll
    }
  };

  if (outcome.isBust) {
    return concludeRound(rolledState);
  }

  return rolledState;
}

function handleBankPlayer(state: GameState, playerId: string): GameState {
  if (!state.turn.hasRolledThisTurn) {
    return state;
  }

  const playerIndex = state.players.findIndex((player) => player.id === playerId);
  if (playerIndex === -1 || state.players[playerIndex].hasBankedThisRound) {
    return state;
  }

  const nextPlayers = state.players.map((player, index) => {
    if (index !== playerIndex) {
      return player;
    }

    return {
      ...player,
      score: player.score + state.round.bankTotal,
      hasBankedThisRound: true
    };
  });

  const nextRound = {
    ...state.round,
    bankedPlayerIds: state.round.bankedPlayerIds.includes(playerId)
      ? state.round.bankedPlayerIds
      : [...state.round.bankedPlayerIds, playerId]
  };

  const nextState: GameState = {
    ...state,
    players: nextPlayers,
    round: nextRound
  };

  if (allPlayersBanked(nextPlayers)) {
    return concludeRound(nextState);
  }

  return nextState;
}

function handleAdvanceTurn(state: GameState): GameState {
  if (!state.turn.hasRolledThisTurn) {
    return state;
  }

  const nextActivePlayerIndex = findNextActivePlayerIndex(
    state.players,
    state.turn.activePlayerIndex
  );
  if (nextActivePlayerIndex === null) {
    return concludeRound(state);
  }

  return {
    ...state,
    turn: {
      ...state.turn,
      activePlayerIndex: nextActivePlayerIndex,
      hasRolledThisTurn: false
    }
  };
}

function concludeRound(state: GameState): GameState {
  if (state.round.currentRound >= state.settings.roundCount) {
    return completeGame(state);
  }

  const nextStartingPlayerIndex = getNextRoundStartingPlayerIndex(
    state.players.length,
    state.turn.activePlayerIndex
  );

  return {
    ...state,
    players: resetRoundBankFlags(state.players),
    round: {
      currentRound: state.round.currentRound + 1,
      bankTotal: 0,
      bankedPlayerIds: [],
      turnCountInRound: 0
    },
    turn: {
      activePlayerIndex: nextStartingPlayerIndex,
      hasRolledThisTurn: false,
      lastRoll: null
    },
    status: {
      screen: "gameplay",
      isGameComplete: false,
      winnerIds: []
    }
  };
}

function completeGame(state: GameState): GameState {
  return {
    ...state,
    turn: {
      ...state.turn,
      hasRolledThisTurn: false
    },
    status: {
      screen: "end-of-game",
      isGameComplete: true,
      winnerIds: calculateWinnerIds(state.players)
    }
  };
}

function resolveRollOutcome(
  bankTotal: number,
  roll: DiceRoll,
  isEarlyTurn: boolean
): RollOutcome {
  if (roll.total === BUST_TOTAL) {
    if (isEarlyTurn) {
      return {
        nextBankTotal: bankTotal + EARLY_SEVEN_BONUS,
        isBust: false
      };
    }

    return {
      nextBankTotal: bankTotal,
      isBust: true
    };
  }

  if (roll.isDouble && !isEarlyTurn) {
    return {
      nextBankTotal: bankTotal * 2 + roll.total,
      isBust: false
    };
  }

  return {
    nextBankTotal: bankTotal + roll.total,
    isBust: false
  };
}

function getNextRoundStartingPlayerIndex(
  playerCount: number,
  currentIndex: number
): number {
  if (playerCount < 1) {
    return 0;
  }

  return (currentIndex + 1) % playerCount;
}

function findNextActivePlayerIndex(
  players: Player[],
  currentIndex: number
): number | null {
  if (players.length === 0) {
    return null;
  }

  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidateIndex = (currentIndex + offset) % players.length;
    if (!players[candidateIndex].hasBankedThisRound) {
      return candidateIndex;
    }
  }

  return null;
}

function allPlayersBanked(players: Player[]): boolean {
  return players.every((player) => player.hasBankedThisRound);
}

function resetRoundBankFlags(players: Player[]): Player[] {
  return players.map((player) => ({
    ...player,
    hasBankedThisRound: false
  }));
}

function buildDiceRoll(dieOne: number, dieTwo: number): DiceRoll {
  const total = dieOne + dieTwo;
  return {
    dieOne,
    dieTwo,
    total,
    isDouble: dieOne === dieTwo
  };
}

function isValidDieValue(value: number): boolean {
  return Number.isInteger(value) && value >= DIE_MIN && value <= DIE_MAX;
}
