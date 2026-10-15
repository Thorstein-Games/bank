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
- Tests: `npm test`
