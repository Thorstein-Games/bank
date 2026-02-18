# Bank Dice Game

Live URL:

- [https://thorstein-games.github.io/bank/](https://thorstein-games.github.io/bank/)

## How it works

- Static export is enabled in `next.config.mjs` via `output: "export"`.
- GitHub Pages base path is configured as `/bank` for production builds.
- Deployment workflow is in `.github/workflows/deploy-pages.yml`.
- Workflow runs lint, typecheck, tests, and static build, then publishes the `out` folder.
- Theme styles are driven by CSS variables in `src/styles/index.css` with shared tokens
  consumed by component styles to keep light/dark contrast consistent.

## Local commands

- Dev server: `npm run dev`
- Production static build: `npm run build`
- Tests: `npm test`
