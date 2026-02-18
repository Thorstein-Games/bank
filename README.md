# Bank Dice Game

Static Next.js deployment target: GitHub Pages for `Thorstein-Games/bank`.

Live URL:
- [https://thorstein-games.github.io/bank/](https://thorstein-games.github.io/bank/)

## Deploy Setup (one-time in GitHub)

1. Open repo settings for `Thorstein-Games/bank`.
2. Go to `Settings` -> `Pages`.
3. Set `Build and deployment` source to `GitHub Actions`.
4. Push to `main` to trigger deployment.

## How it works

- Static export is enabled in `/Users/craigwalker/Desktop/code/bank/next.config.mjs` via `output: "export"`.
- GitHub Pages base path is configured as `/bank` for production builds.
- Deployment workflow is in `/Users/craigwalker/Desktop/code/bank/.github/workflows/deploy-pages.yml`.
- Workflow runs lint, typecheck, tests, and static build, then publishes the `out` folder.

## Local commands

- Dev server: `npm run dev`
- Production static build: `npm run build`
- Tests: `npm test`
