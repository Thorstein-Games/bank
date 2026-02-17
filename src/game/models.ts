export type DiceMode = "built-in" | "manual";
export type ThemePreference = "system" | "light" | "dark";
export type GameScreen = "setup" | "gameplay" | "end-of-game";

export interface Player {
  id: string;
  name: string;
  score: number;
  hasBankedThisRound: boolean;
}

export interface GameSettings {
  roundCount: number;
  diceMode: DiceMode;
  theme: ThemePreference;
}

export interface DiceRoll {
  dieOne: number;
  dieTwo: number;
  total: number;
  isDouble: boolean;
}

export interface RoundState {
  currentRound: number;
  bankTotal: number;
  bankedPlayerIds: string[];
  turnCountInRound: number;
}

export interface TurnState {
  activePlayerIndex: number;
  hasRolledThisTurn: boolean;
  lastRoll: DiceRoll | null;
}

export interface GameStatus {
  screen: GameScreen;
  isGameComplete: boolean;
  winnerIds: string[];
}

export interface GameState {
  players: Player[];
  settings: GameSettings;
  round: RoundState;
  turn: TurnState;
  status: GameStatus;
}
