# SPEC.md — Bank Dice Game

## 1. Overview

**Bank** is a fast-paced multiplayer dice game played over a fixed number of rounds. Players compete to accumulate the highest total score by participating in a shared communal bank each round and choosing when to secure points by banking.

The game is implemented as a **Next.js** web app (React-based), with all gameplay logic running client-side in the browser and persistent state stored in `localStorage`.

Primary target platform: **mobile web**, with responsive desktop support.

---

## 2. Game Summary

- 2–16 players.
- Game lasts **10, 15, 20, or custom number of rounds**.
- Each round continues until ended by a bust condition (rolling a 7 after the first three turns).
- Players take turns rolling two dice.
- A communal **Bank Total** grows during a round.
- Players may **bank** the communal total to secure points.
- Rolling doubles may multiply the communal bank.
- Rolling a 7 after the first three turns ends the round.

At game end, player(s) with the highest score win.

---

## 3. Core Concepts

### 3.1 Round

A round is an open-ended sequence of player turns that continues until a bust event ends it.

A round does **not** end during the first three turns due to rolling a 7.

### 3.2 Turn Order

Players act in fixed clockwise order.

Each turn:

1. Player rolls dice.
2. Dice result updates the communal bank.
3. After the turn, players may choose to bank by selecting a player card in the scoreboard.
4. Turn auto-advances shortly after a roll resolves.
5. If the active player banks, turn advances immediately to the next player still in the round.

If a player banks, they are out for the remainder of that round.

---

## 4. Dice Rules

Each turn consists of a **single roll** of two dice.

### 4.1 Normal Roll

Sum of dice contributes to the communal bank (see doubles rules).

### 4.2 Doubles

If both dice show the same value:

- **After first 3 turns of the round**:
  - Existing communal bank is doubled **before** adding the new roll value.

- **During first 3 turns**:
  - Doubles behave like a normal roll.
  - No doubling occurs.

### 4.3 Rolling a 7

#### First 3 turns of round

- A 7 **adds 70 points** to communal bank.
- Round continues.

#### After first 3 turns

- Round ends immediately.
- All players still in the round who have not banked receive **0 points for that round**.
- Banked players keep their points.

---

## 5. Banking Rules

After each player's turn:

- The scoreboard is always visible during gameplay.
- Any player still active in the round may choose to **bank** by selecting their scoreboard card.
- Banking:
  - Adds the **current communal Bank Total** to their score.
  - Ends their participation in the round.
- Multiple players may bank the same communal value at different times.
- If a player does nothing, they remain active and continue next cycle.

---

## 6. Round Flow

1. Round starts with communal Bank Total = 0.
2. Players take turns rolling dice.
3. Bank grows according to dice results.
4. Players may bank after turns.
5. Round ends when:
   - A 7 is rolled after turn three.
6. Next round begins.
7. Continue until configured round count reached.

No special conditions occur in the final round.

---

## 7. Winning Conditions

- Highest total score after final round wins.
- Ties result in multiple winners.

---

## 8. Game Setup Requirements

### Player Setup

- 2–16 players allowed.
- Names must be:
  - Non-empty
  - Unique
- Player list locked after game starts.

### Game Options

- Round count: 10 / 15 / 20 / custom.
- Dice mode:
  - Built-in dice (default)
  - Manual input mode

---

## 9. Dice Modes

### Built-in Dice

- Uses cryptographically fair RNG:
  `crypto.getRandomValues`.
- Includes animated dice roll.

### Manual Dice Mode

- Players input each die value manually.
- No animation.
- Dice values still displayed.
- No undo support.

Mode selected at setup and applies to entire game.

---

## 10. Persistence

Game state saved to `localStorage`.

Saved state includes:

- Player list and order
- Current round number
- Turn index
- Players banked this round
- Communal bank total
- Player scores
- Game settings
- Dice mode
- Theme preference

On load:

- User is prompted with **Resume Game** or **New Game**.

Settings include ability to clear saved game.

If reload occurs mid-roll, rolled values are stored and animation skipped.

---

## 11. User Interface Requirements

### Core UI

- Player list and scores visible.
- Current player highlighted.
- Round total shown as the most prominent in-game element.
- Banked players marked.
- Buttons:
  - Settings
  - Play Again (after game end)
  - Change Settings for Next Game (after game end)
- Dice tray is clickable and triggers roll actions.
- During gameplay, turns auto-advance to the next player shortly after a roll resolves.
- During gameplay, if the active player banks, turn immediately moves to the next in-round player.
- During gameplay, player bank actions stay visible and can be used whenever communal bank is above 0.

Settings trigger sits at the top-right of the Setup panel and at the top-right of the Gameplay panel.

Settings controls open in a modal dialog from either trigger.

### Layout

- Mobile-first responsive design.
- Desktop layout supported.
- Scoreboard uses a 2-column grid on mobile and a 3-column grid on desktop.

---

## 12. Dice Animation

- 3D cube-style dice.
- Animation duration ~800 ms.
- Result revealed after animation completes.
- Skipped when resuming game.

---

## 13. Audio

Sound effects required:

- Dice rolling sound
- Money chime when banking a player from the scoreboard

Audio should respect user interaction policies and optional mute control.
Mute control is available from the settings panel.

---

## 14. Accessibility

Minimum accessibility support:

- Keyboard controls for roll and bank.
- Screen-reader readable state updates.
- Reduced motion support using `prefers-reduced-motion`.
- Proper button semantics and focus handling.

---

## 15. Theme Support

- Default theme uses system preference (`prefers-color-scheme`).
- User may override with Light or Dark mode.
- Preference stored in localStorage.
- Surface styling should favor flat, token-based fills over multi-stop gradients.
- Dark mode must preserve contrast for dice pips and status badges.

---

## 16. Settings Panel

Settings must include:

- Mute / unmute audio control
- Theme selection
- Dice mode selection
- Round count configuration
- Reset saved game
- Collapsible Rules section

Rules are read-only.

---

## 17. End-of-Game Flow

After final round:

- Winners displayed.
- Winners are marked with a trophy badge on the final scoreboard.
- End screen includes a result summary banner announcing the winner or tie result.
- Final scoreboard shown as ranked player cards (position + final score).
- Side-cannon confetti burst animation plays once.
- “Play Again” and “Change Settings for Next Game” buttons available.

Play Again:

- Resets scores and rounds.
- Keeps player list.

Change Settings for Next Game:

- Returns to setup with player names and previous game settings prefilled.
- Allows editing setup values before starting again.

---

## 18. Edge Case Handling

- Bank disabled until roll occurs.
- Banked players skipped in turn order.
- Bust applies to player who rolled and all remaining active players.
- Manual dice mode has no undo.
- Animation skipped when resuming game.

---

## 19. Technical Constraints

- Implementation must use:
  - Next.js
  - React
  - CSS (or CSS Modules)
- Gameplay functionality must run client-side.
- Core game state must not depend on a backend service.
- `localStorage` remains the persistence layer for resumable play.

---

## 20. SEO Requirements

The site must be optimized for the target phrase: **"Play Bank Dice Game Online"**.

- Primary SEO target keyword: `Play Bank Dice Game Online`.
- Page title must include the exact phrase near the start.
- Meta description must include the exact phrase naturally once.
- Main page `h1` must include the exact phrase.
- Introductory page copy (visible text) must include the phrase and briefly explain the game.
- Open Graph and Twitter metadata must be configured for link sharing.
- Canonical URL must be set for the primary game page.
- `robots.txt` and `sitemap.xml` must be present and allow indexing of the main game page.
- The app must ship semantic HTML structure for crawlability (single primary `h1`, logical heading order).
- SEO metadata should be configured through Next.js metadata APIs.

---

## 21. Future Extensions (Out of scope)

Possible later enhancements:

- Online multiplayer
- Player avatars
- Stats history

---
