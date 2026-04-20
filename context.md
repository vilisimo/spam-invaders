# Spam Invaders — Claude Code Handoff Document

## Project Overview

**Spam Invaders** is a single-file HTML/Canvas arcade game built for the **Wix Emails** team booth at an engineering conference. The conference theme is "sport" (competition between players). The game runs on a laptop at the booth, players compete for high scores on a leaderboard.

**Target play session:** ~1 minute for casual players, longer for skilled players.

The game is a take on Space Invaders with an email/spam filtering theme. It's a small set of static files — `index.html`, `game.js`, and `leaderboard.html` — no build step, no dependencies, pure vanilla JS + Canvas API.

## Game Concept & Rules

Emails drop from the top of the screen in straight lines (Tetris-style descent). The player controls a mailman character at the bottom that can move left/right and shoot upward. Holding a direction key ramps movement speed from 1x up to 2x over ~400ms of continuous hold.

### Three email types:

| Type | Visual | Action | Correct behavior |
|------|--------|--------|-----------------|
| **Spam** | Dark red envelope | Shoot it | If it passes through or hits mailman → lose a life |
| **Legit** | Green envelope with glow | Let it pass or catch it | Either way scores +15 (delivered). Shooting it → lose a life, -50 pts |
| **VIP** | Gold envelope, strong glow | Catch with mailman | +1 life (max 5), +50 pts. From Nir Zohar, Avishai Abrahami, or Yaniv Even-Haim |

### Progression:
- Levels end after handling a set number of emails (10 + 5 per level)
- Each level increases drop speed and spawn rate
- VIP emails: max one per level, ~8% spawn chance per email in the second half of a level
- Combo system: shooting spam in quick succession builds a combo multiplier

### Scoring:
- Shoot spam: 10 × (1 + floor(combo/3)) points
- Legit email passes through or hits mailman: +15
- Catch VIP: +50 + extra life
- Shoot legit: -50, lose life
- Shoot VIP: -100, lose life
- Level completion bonus: level × 30
- 3 lives to start, max 5

### Controls:
- Arrow keys or A/D to move (hold to ramp speed up to 2x)
- Space to shoot
- Space to start from menu
- L from menu opens the standalone leaderboard page (`leaderboard.html`)
- Name entry after game over → in-game leaderboard screen

## Technical Details

- **Files:** `index.html` (thin shell), `game.js` (all game logic, ~650 lines), `leaderboard.html` (standalone leaderboard view)
- **Rendering:** HTML5 Canvas, internal resolution 800×600, scaled to fit the viewport via `fitCanvas()` (CSS scaling, ~95% of the smaller window dimension)
- **Game loop:** `requestAnimationFrame` with delta time
- **State machine:** `menu` → `play` → `over` (name entry) → `leaderboard` → `menu`. From `menu`, L navigates to `leaderboard.html`.
- **Leaderboard:** Persisted in `localStorage` under key `spamInvadersLeaderboard` (top 10 by score). Survives reloads.

### Key functions:
- `initGame()` — resets all state for a new game
- `spawnEmail()` — creates a new email with type/position/speed based on current level
- `getLevelParams()` — returns speed, spawn interval, emails needed, and legit ratio for current level
- `advanceLevel()` — tracks emails handled, triggers level transition and level-up bonus when threshold met
- `update(dt)` — main game logic (movement, collisions, spawning)
- `draw()` — renders everything per frame (menu, play, over, leaderboard)
- `drawEnvelope()` — utility to draw an envelope shape at given position
- `drawBgEnvelope()` / `drawBgAt()` / `drawBgPlane()` — background mail-field parallax sprites
- `drawAirmailBorder()` — red/blue airmail stripe border
- `fitCanvas()` — recomputes CSS scaling on load and on window resize
- `spawnParticles()` — particle burst utility

### Key game parameters (tune these):
```
dropSpeed = 2.5 + (level-1) * 0.6     // email fall speed per level
spawnInterval = max(350, 1200 - (level-1) * 80)   // ms between spawns
emailsNeeded = 10 + (level-1) * 5     // to clear a level
legitRatio = min(0.45, 0.25 + level * 0.02)
vipChance = 8% per spawn in the second half of a level (max 1 per level)
shootCooldown = 280ms
playerSpeed = 5.5 (base), boost 1x→2x over ~400ms of held direction
bulletSpeed = -9 (upward)
comboWindow = 2000ms
levelTransition = 2000ms screen-dim pause between levels
startingLives = 3, maxLives = 5
levelClearBonus = level * 30
```

## Known Issues & Improvements Needed

### Bugs / Polish Issues

1. **Legit emails hitting mailman vs passing through:** Both "caught by mailman" and "falling past the screen" award +15 for legit emails. This is intentional — the mailman delivers them either way — but the visual treatment is identical, so the player doesn't get feedback differentiating the two outcomes. Consider distinct particle colors or a brief catch animation.

2. **Spam touching mailman:** If spam overlaps the player hitbox it costs a life (intended). The hitbox is a rectangle around the full mailman sprite; dodging can feel unfair because the sprite has arms/satchel extending past the body. Consider tightening the hitbox to the torso.

3. **Level transition:** There's a 2-second pause between levels where the screen dims. During this time no input is processed. This could feel laggy at a booth. Consider shortening or making it feel more dynamic.

4. **No sound at all.** For a booth game, audio feedback would massively improve the experience. Consider adding simple sounds for: shooting, destroying spam, catching VIP, losing a life, level up, game over.

5. **Leaderboard persistence across booth sessions.** The leaderboard is stored in `localStorage`, so it persists across reloads and across days on the same machine. For a fresh start each day, manually clear `localStorage` or add a "reset leaderboard" affordance.

### Gameplay Improvements to Consider

6. **Visual feedback for near-misses:** When spam barely passes by the mailman, there's no indication of how close it was. A "close call" visual or bonus could add excitement.

7. **Difficulty curve may be too gentle early on.** First level with only 10 emails at slow speed might feel boring for experienced gamers. Consider starting slightly faster or having a "hard mode" toggle.

8. **No pause functionality.** At a booth this could be useful if someone needs to step away momentarily.

9. **Email spawn positioning:** Emails spawn at random X positions. Sometimes multiple emails stack in the same column making it impossible to shoot one without hitting another behind it. Consider minimum spacing between active emails.

10. **The "MAILMAN" label below the player sprite** is small and may not be visible at booth distance. The sprite itself is now an illustrated mailman (cap, uniform, satchel), so the text label is arguably redundant.

11. **Mobile/touch support:** If this might be played on a tablet at the booth, touch controls would be needed (currently keyboard only).

12. **Canvas scales via CSS only.** Internal resolution is fixed 800×600 and `fitCanvas()` scales it to ~95% of the smaller window dimension. This works on any laptop but can look soft at very high DPI or letterboxed at unusual aspect ratios.

### Feature Ideas from Original Discussion

13. **Envelope Launcher variant** was discussed as an alternative concept (Angry Birds-style catapult). Could be a second game mode.

14. **The original Space Invaders grid formation** was tried first but had issues with legit emails blocking spam. The current Tetris-drop approach solved this. Don't go back to grid formation.

15. **Screen shake was removed** by design — it was too jarring especially on game over. Don't re-add it.

## Design Decisions & Context

- **Why static files / no build?** Booth simplicity — open `index.html` and go. No server, no build, no install. Logic lives in `game.js`; `leaderboard.html` is a separate static page for showing the persisted top-10 outside of a run.
- **Why persist the leaderboard?** Booth sessions span multiple hours / multiple days; `localStorage` lets scores accumulate across reloads. If a daily reset is wanted, clear storage manually.
- **Why Tetris-drop instead of Space Invaders grid?** Grid formation caused a problem where legit emails in front rows blocked bullets from reaching spam behind them. Tried putting legit in top rows, but that still caused issues. Dropping individual emails from random positions solved it cleanly.
- **Legit emails: catch OR let pass.** Both outcomes deliver the email and score +15. The only wrong action for legit is shooting it. This keeps the core rule simple ("don't shoot green") without penalizing the player for accidental catches while chasing spam.
- **VIP emails (Nir, Avishai, Yaniv):** These are Wix leadership/founders. They're an easter egg that Wix employees will recognize. They should stay rare and rewarding.
- **Conference theme is "sport":** The competitive element is the leaderboard. The game itself is a single-player score attack. The "sport" aspect comes from players trying to beat each other's scores at the booth.
