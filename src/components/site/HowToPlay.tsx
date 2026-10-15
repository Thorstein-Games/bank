import { GAME_RULE_SECTIONS } from "@/game/rules";
import styles from "./SiteInfo.module.css";

// Crawlable rules for people who find the game before they know how to play.
export default function HowToPlay() {
  return (
    <section className={styles.howTo} aria-labelledby="how-to-play-heading">
      <h2 id="how-to-play-heading">How to play Bank</h2>
      <p className={styles.lede}>
        Bank is a push-your-luck dice game for 2 to 16 players. Everyone shares
        one pot, the bank, and it grows with every roll. Bank it to lock the
        points into your score, or stay in and hope it keeps growing. Once the
        first three rolls are done, a 7 ends the round and anyone who
        hasn&apos;t banked gets nothing.
      </p>

      <ol className={styles.steps}>
        <li>
          <strong>Set up.</strong> Add your players and pick 10, 15, 20 or a
          custom number of rounds. Use the built-in dice, or roll real dice and
          type in the results.
        </li>
        <li>
          <strong>Roll.</strong> Players take turns rolling two dice. The total
          goes into the bank.
        </li>
        <li>
          <strong>Bank or keep going.</strong> After the third roll, any player
          still in the round can bank the current pot, adding it to their score.
          They sit out for the rest of the round.
        </li>
        <li>
          <strong>Watch for 7s.</strong> In the first three rolls a 7 is worth
          70 points. After that, a 7 ends the round. Doubles after the third
          roll double the bank.
        </li>
        <li>
          <strong>Win.</strong> Whoever has the most points after the last round
          wins.
        </li>
      </ol>

      <h3>Full rules</h3>
      <div className={styles.ruleGrid}>
        {GAME_RULE_SECTIONS.map((section) => (
          <div key={section.title}>
            <h4>{section.title}</h4>
            <ul>
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
