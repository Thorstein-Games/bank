# CLAUDE.md

@AGENTS.md

Bank: push-your-luck dice game. Next.js 14 (App Router) static export, served at thorsteingames.com/bank (GitHub Pages, base path `/bank` in production). `npx tsc --noEmit`, `npm run lint` and `npm test` (jest) before committing.

## Shared Thorstein Games bar and footer

`src/app/layout.tsx` loads `https://thorsteingames.com/tg-bar.js` (served by the thorstein-games-website repo, whose CLAUDE.md has the full contract) and renders `<tg-bar game="bank">` (thin site header, hides while scrolling down) before the page. `SiteFooter` is `<tg-footer game="bank">` (other games, More Games, contact, privacy, copyright), and the end-of-game screen shows `<tg-more-games game="bank">` ("Play a different game"). JSX types for the tags are in `src/tg-elements.d.ts`.

- The bar is always 40px. `globals.css` holds that space before the script loads (`tg-bar:not(:defined)`), and the game's `.page` is `100dvh - 40px` tall at least, so the footer starts below the fold. Keep those in step.
- `NEXT_PUBLIC_TG_BAR_SRC` overrides the script URL (`""` turns it off, e.g. for tests).
