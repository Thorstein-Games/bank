/**
 * The shared Thorstein Games footer (tg-bar.js, see CLAUDE.md): every other
 * game, the rainbow More Games button, contact, privacy and copyright, with
 * the page's banner ad above it.
 */
export default function SiteFooter() {
  return (
    <>
      <tg-ad game="bank" format="banner" style={{ padding: "24px 0" }}></tg-ad>
      <tg-footer game="bank"></tg-footer>
    </>
  );
}
