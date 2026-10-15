import styles from "./SiteInfo.module.css";

const LINKS = [
  { label: "Home", href: "https://thorsteingames.com/" },
  { label: "Tier Ranker", href: "https://thorsteingames.com/tier-ranker" },
  { label: "Bracket Maker", href: "https://thorsteingames.com/bracket-maker" },
  { label: "Contact", href: "https://thorsteingames.com/contact" },
];

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.footerNav} aria-label="Footer">
        <ul className={styles.footerLinks}>
          {LINKS.map((link) => (
            <li key={link.label}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
        {/* Same rainbow button as the other Thorstein Games. */}
        <a
          className={styles.moreGames}
          href="https://thorsteingames.com/"
          target="_blank"
          rel="noopener"
        >
          More Games
        </a>
      </nav>
      <p className={styles.copy}>
        © {new Date().getFullYear()} Thorstein Games
      </p>
    </footer>
  );
}
