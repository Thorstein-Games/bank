# Bank Dice Game

![Bank Logo](bank_logo.png)

Live URL:

- [https://thorsteingames.com/bank](https://thorsteingames.com/bank) (thorsteingames.com proxies to the GitHub Pages site, [thorstein-games.github.io/bank](https://thorstein-games.github.io/bank/))

## SEO and sharing

- `src/app/site.ts`: `SITE_URL` (canonical, no trailing slash) and `asset()` for the `/bank` base path. Metadata icon and manifest URLs don't get Next's `basePath`, so they go through `asset()`.
- `src/app/layout.tsx`: title, description, Open Graph/Twitter metadata, the share image (`public/og-image.jpg`, 1200×630) and `WebApplication` JSON-LD. The canonical `<link>` and `og:url` are written into `<head>` directly, because `trailingSlash: true` would otherwise turn them into `/bank/`, which thorsteingames.com redirects to `/bank`.
- `src/components/site/`: the crawlable "How to play Bank" section (built from `GAME_RULE_SECTIONS` in `src/game/rules.ts`) and the footer with links back to Thorstein Games.

## Local commands

- Dev server: `npm run dev`
- Production static build: `npm run build`
- Unit tests (Jest): `npm test`
- End-to-end tests (Playwright): `npm run build && npm run test:e2e`

## Testing

- **Unit (Jest, `src/**/*.test.ts(x)`)**: game rules against `SPEC.md` (`src/game/reducer*.test.ts`), dice, setup validation, save/restore and corrupt-save handling, end-of-game stats, SEO metadata and components.
- **E2E (Playwright, `e2e/*.spec.ts`)**: runs against the production static export in `out/`, served under `/bank` by `e2e/serve.mjs`, at desktop (1280px) and phone (390px) widths. Covers setup validation, full games with fixed dice (built-in and manual mode), banking, busts, the end screen, reload/resume, settings (rules, theme, mute), head tags and asset paths. Every test fails on console errors.
  - Dice are fixed by stubbing `crypto.getRandomValues` (`setDice()` in `e2e/fixtures.ts`).
  - Network leaving the local server is stubbed: `tg-bar.js` is empty and canvas-confetti is a counter. `e2e/footer.spec.ts` runs the real `tg-bar.js` (live, or `TG_BAR_JS_FILE=../thorstein-games-website/public/tg-bar.js`) and skips if it can't get it.
  - First run: `npx playwright install chromium`. Reports land in `playwright-report/` and `test-results/` (git-ignored).
- **CI**: `.github/workflows/test.yml` runs lint, typecheck, Jest, build and e2e on pull requests and non-main pushes. `deploy-pages.yml` runs the same before uploading, so `main` never deploys a failing build.
