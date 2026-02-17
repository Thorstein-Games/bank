# Bank Dice Game Implementation Plan

This plan translates `SPEC.md` into incremental build phases for a client-side Next.js implementation. Tasks are intentionally small and trackable, with each phase ending in a verifiable milestone before moving forward.

## Scope

- In scope: Setup flow, full Bank game rules, dice modes, persistence, settings, accessibility, responsive UI, and SEO requirements in the spec.
- Out of scope: Online multiplayer, avatars, long-term stats history, backend services. But create the architecture so that online multiplayer could be a fast follow up.

## Phase 1 - Project Foundation and Architecture

- [x] Initialize a Next.js app structure with TypeScript enabled and CSS Modules support.
- [x] Create core folders for `components`, `game`, `state`, `hooks`, `utils`, and `styles`.
- [x] Define TypeScript domain models for players, settings, round state, turn state, and game status.
- [x] Add centralized game constants for round presets, player limits, dice bounds, and bust rules.
- [x] Set up a lightweight app shell with sections reserved for setup, gameplay, and end-of-game screens.
- [x] Add a localStorage utility module with safe JSON parse/stringify and key versioning helpers.
- [x] Set up unit testing (logic-focused) with a baseline test command in project scripts.
- [x] Add a smoke test that verifies the app can render setup UI without runtime errors.

## Phase 2 - Game Setup Experience

- [x] Build a setup form that allows entering 2-16 player names.
- [x] Add inline validation for non-empty player names and uniqueness across all entered players.
- [x] Add controls for round count presets (10/15/20) plus a custom round count input.
- [x] Add dice mode selector with `Built-in` and `Manual input` options.
- [x] Add theme selector options for `System`, `Light`, and `Dark`.
- [x] Disable game start until setup inputs are valid and complete.
- [x] On start, lock the player list/order and create the initial game state object.
- [x] Add tests for setup validation rules and state initialization behavior.

## Phase 3 - Core Game Engine (Pure Logic)

- [x] Implement a pure reducer/state-machine for turn progression and round transitions.
- [x] Add roll resolution logic for normal rolls that increase the communal bank by dice sum.
- [x] Add doubles behavior during first three turns where doubles act as normal rolls only.
- [x] Add doubles behavior after turn three where communal bank doubles before adding roll sum.
- [x] Add special handling for rolling 7 in first three turns (+70 to communal bank).
- [x] Add bust handling for rolling 7 after turn three that ends the round immediately.
- [x] Implement banking action that awards current communal bank and marks player as banked.
- [x] Allow multiple active players to bank after each resolved turn.
- [x] Skip banked players automatically when advancing turn order.
- [x] Implement round reset logic (bank total reset, banked markers reset, next round increment).
- [x] Implement game completion logic and winner calculation including tie handling.
- [x] Add exhaustive unit tests for all dice rules, bank flow, and round/game transitions.

## Phase 4 - Turn Flow and Gameplay UI

- [ ] Build a gameplay header showing current round and total configured rounds.
- [ ] Render scoreboard with player names, cumulative scores, and banked-state indicators.
- [ ] Highlight the active player clearly in turn order.
- [ ] Show communal bank total prominently and update it immediately after each roll.
- [ ] Add `Roll` button behavior tied to the active turn state.
- [ ] Keep `Bank` action disabled until a roll has occurred in the current turn cycle.
- [ ] Add post-turn banking controls so every still-active player can choose bank or continue.
- [ ] Ensure banked players are visually marked and cannot roll again in that round.
- [ ] Add `Settings` entry point accessible from gameplay UI.
- [ ] Add component-level tests for button disabled/enabled states and turn highlighting.

## Phase 5 - Dice Systems (Built-in + Manual)

- [ ] Implement built-in dice rolling with `crypto.getRandomValues` for fair random values.
- [ ] Normalize random bytes into die values constrained to 1-6.
- [ ] Build a 3D-styled dice animation sequence with approximately 800 ms duration.
- [ ] Delay outcome commit until animation completion for built-in mode.
- [ ] Implement manual dice input controls for die one and die two values (1-6).
- [ ] Bypass animation entirely in manual mode while still rendering resulting dice faces.
- [ ] Add guardrails to prevent invalid manual input submission.
- [ ] Add tests verifying both dice modes produce valid turn outcomes and consistent rule handling.

## Phase 6 - Persistence, Resume, and Reset Flows

- [ ] Persist full game state to localStorage after each meaningful state transition.
- [ ] Persist required fields: players/order, scores, round/turn pointers, bank total, banked set, settings, dice mode, and theme preference.
- [ ] Track in-progress roll result data so reload can skip animation and resume stable state.
- [ ] On app load, detect saved state and show `Resume Game` vs `New Game` prompt.
- [ ] Implement `Resume Game` to hydrate state safely and validate schema/version before use.
- [ ] Implement `New Game` to discard existing saved run and initialize from setup.
- [ ] Add settings action to clear saved game data explicitly.
- [ ] Add `Play Again` flow that resets rounds/scores while preserving the player list.
- [ ] Add tests for hydration, migration fallback, and reset behaviors.

## Phase 7 - Settings Panel, Theme, and Rules Display

- [ ] Build a settings panel accessible during gameplay and from setup context.
- [ ] Add theme controls that apply immediately and persist selected preference.
- [ ] Default to system theme when user has not selected explicit light/dark override.
- [ ] Add dice mode setting display and enforce mode consistency for the active game.
- [ ] Add round-count configuration controls as defined by spec.
- [ ] Add `Reset Saved Game` control with confirmation to avoid accidental data loss.
- [ ] Add a collapsible, read-only Rules section sourced from a static rules definition.
- [ ] Add tests for theme persistence, settings updates, and rules panel interaction.

## Phase 8 - Audio, Accessibility, and Responsive UX

- [ ] Add dice roll sound effect trigger on roll start in built-in mode.
- [ ] Add bank confirmation sound effect when a bank action succeeds.
- [ ] Add global mute/unmute control and persist user audio preference.
- [ ] Ensure audio only plays after valid user interaction to satisfy browser policies.
- [ ] Implement keyboard shortcuts and focusable controls for roll and bank actions.
- [ ] Add `aria-live` announcements for roll results, bank updates, bust events, and winners.
- [ ] Implement reduced-motion handling via `prefers-reduced-motion` to shorten/skip animations.
- [ ] Verify semantic button usage and predictable focus transitions between turn states.
- [ ] Complete responsive layout refinements for mobile-first behavior with desktop adaptation.
- [ ] Run accessibility checks and fix discovered contrast, labeling, and focus issues.

## Phase 9 - SEO, Metadata, and Launch Validation

- [ ] Configure Next.js metadata with page title starting with `Play bank game online`.
- [ ] Add meta description containing the exact phrase `Play bank game online` naturally once.
- [ ] Ensure the primary page `h1` includes the exact phrase `Play bank game online`.
- [ ] Add introductory visible page copy that includes the target phrase and game summary.
- [ ] Configure Open Graph metadata and Twitter card metadata for sharing.
- [ ] Add canonical URL for the main game page through Next.js metadata APIs.
- [ ] Add `robots.txt` allowing indexing of the primary game route.
- [ ] Add `sitemap.xml` containing the primary game route.
- [ ] Verify semantic heading order with one primary `h1` and crawlable page structure.
- [ ] Run final QA pass covering full-game simulation in both dice modes and multiple player counts.
- [ ] Execute final regression checklist for edge cases: first-three-turn rules, bust timing, bank disable state, and resume mid-roll behavior.
