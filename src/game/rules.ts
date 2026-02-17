export interface RuleSection {
  title: string;
  points: string[];
}

export const GAME_RULE_SECTIONS: RuleSection[] = [
  {
    title: "Round Flow",
    points: [
      "Each round starts with a communal bank of 0.",
      "Players roll in fixed order and can bank after each resolved turn.",
      "A round ends when a 7 is rolled after the first three turns."
    ]
  },
  {
    title: "Dice Effects",
    points: [
      "Normal rolls add both dice to the communal bank.",
      "Doubles after turn three double the bank before adding the roll total.",
      "A 7 in the first three turns adds 70 points and play continues."
    ]
  },
  {
    title: "Banking",
    points: [
      "Any active player can bank after a resolved turn.",
      "Banking adds the current communal bank to that player's score.",
      "Banked players sit out until the next round."
    ]
  },
  {
    title: "Winning",
    points: [
      "Play continues for the configured number of rounds.",
      "Highest score wins after the final round.",
      "Ties produce multiple winners."
    ]
  }
];
