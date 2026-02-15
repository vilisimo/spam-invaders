# Spam Invaders — Claude Code Handoff Document

## Project Overview

**Spam Invaders** is a single-file HTML/Canvas arcade game built for the **Wix Emails** team booth at an engineering conference. The conference theme is "sport" (competition between players). The game runs on a laptop at the booth, players compete for high scores on a leaderboard.

**Target play session:** ~1 minute for casual players, longer for skilled players.

The game is a take on Space Invaders with an email/spam filtering theme. It's a single `index.html` file — no build step, no dependencies, pure vanilla JS + Canvas API.

## Game Concept & Rules

Emails drop from the top of the screen in straight lines (Tetris-style descent). The player controls a "firewall" ship at the bottom that can move left/right and shoot upward.

### Three email types:

| Type | Visual | Action | Correct behavior |
|------|--------|--------|-----------------|
| **Spam** | Dark red envelope | Shoot it | If it passes through or hits firewall → lose a life |
| **Legit** | Green envelope with glow | Let it pass | Scores +15 automatically. Shooting it → lose a life, -50 pts |
| **VIP** | Gold envelope, strong glow | Catch with firewall | +1 life (max 5), +50 pts. From Nir Zohar, Avishai Abrahami, or Yaniv Even-Haim |

### Progression:
- Levels end after handling a set number of emails (10 + 5 per level)
- Each level increases drop speed and spawn rate
- VIP emails: max one per level, ~8% spawn chance per email in the second half of a level
- Combo system: shooting spam in quick succession builds a combo multiplier

### Scoring:
- Shoot spam: 10 × (1 + floor(combo/3)) points
- Legit email passes through or hits firewall: +15
- Catch VIP: +50 + extra life
- Shoot legit: -50, lose life
- Shoot VIP: -100, lose life
- Level completion bonus: level × 30
- 3 lives to start, max 5

### Controls:
- Arrow keys or A/D to move
- Space to shoot
- Space to start from menu
- Name entry after game over → leaderboard

## Technical Details

- **Single file:** `index.html`, ~400 lines
- **Rendering:** HTML5 Canvas, 800×600
- **Game loop:** `requestAnimationFrame` with delta time
- **State machine:** `menu` → `play` → `over` → `leaderboard` → `menu`
- **Leaderboard:** In-memory array (resets on page reload — this is intentional for booth use, fresh each session)

### Key functions:
- `initGame()` — resets all state for a new game
- `spawnEmail()` — creates a new email with type/position/speed based on current level
- `getLevelParams()` — returns speed, spawn interval, emails needed, and legit ratio for current level
- `advanceLevel()` — tracks emails handled, triggers level transition when threshold met
- `update(dt)` — main game logic (movement, collisions, spawning)
- `draw()` — renders everything per frame
- `drawEnvelope()` — utility to draw an envelope shape at given position

### Key game parameters (tune these):
```
baseDropSpeed = 1.0          // starting fall speed
speed per level = +0.35      // speed increase each level
spawnInterval = 1200ms        // starting spawn interval
interval decrease = -80ms     // faster spawning each level (min 350ms)
emailsNeeded = 10 + (level-1)*5
legitRatio = 0.25 + level*0.02 (max 0.45)
shootCooldown = 280ms
playerSpeed = 5.5
bulletSpeed = -9 (upward)
comboWindow = 2000ms
```

## Known Issues & Improvements Needed

### Bugs / Polish Issues

1. **Legit emails hitting firewall vs passing through:** Currently both "hitting the firewall" and "falling past the screen" count as +15 for legit emails. The design intent is that legit emails should simply pass through — the player should just avoid shooting them. The current collision detection means if a legit email lands right on the player, it gets "caught" instead of visually passing through. Consider making legit emails pass through the firewall sprite visually (no collision), or at least making the behavior feel more intentional.

2. **Spam touching firewall:** Currently if spam physically overlaps the player hitbox, it's treated as "spam breached firewall" and costs a life. This is correct, but the hitbox overlap can feel unfair if the player is trying to dodge — the firewall triangle is wider at the base. Consider whether the collision box should be tighter.

3. **Level transition:** There's a 2-second pause between levels where the screen dims. During this time no input is processed. This could feel laggy at a booth. Consider shortening or making it feel more dynamic.

4. **No sound at all.** For a booth game, audio feedback would massively improve the experience. Consider adding simple sounds for: shooting, destroying spam, catching VIP, losing a life, level up, game over.

5. **Leaderboard resets on reload.** This is fine for a booth session but could be improved with persistent storage if needed for a longer event.

### Gameplay Improvements to Consider

6. **Visual feedback for near-misses:** When spam barely passes by the firewall, there's no indication of how close it was. A "close call" visual or bonus could add excitement.

7. **Difficulty curve may be too gentle early on.** First level with only 10 emails at slow speed might feel boring for experienced gamers. Consider starting slightly faster or having a "hard mode" toggle.

8. **No pause functionality.** At a booth this could be useful if someone needs to step away momentarily.

9. **Email spawn positioning:** Emails spawn at random X positions. Sometimes multiple emails stack in the same column making it impossible to shoot one without hitting another behind it. Consider minimum spacing between active emails.

10. **The firewall label "FIREWALL" below the player ship** is small and may not be visible. Consider making the ship more obviously themed (e.g., a shield icon, or a more recognizable shape).

11. **Mobile/touch support:** If this might be played on a tablet at the booth, touch controls would be needed (currently keyboard only).

12. **The game canvas is fixed 800×600.** It doesn't adapt to screen size. For different laptops at the booth, responsive scaling would help.

### Feature Ideas from Original Discussion

13. **Envelope Launcher variant** was discussed as an alternative concept (Angry Birds-style catapult). Could be a second game mode.

14. **The original Space Invaders grid formation** was tried first but had issues with legit emails blocking spam. The current Tetris-drop approach solved this. Don't go back to grid formation.

15. **Screen shake was removed** by design — it was too jarring especially on game over. Don't re-add it.

## Design Decisions & Context

- **Why single file?** Booth simplicity — open the HTML file and go. No server, no build, no install.
- **Why no persistent leaderboard?** Fresh start each day at the conference keeps it fair. Could add `localStorage` if multi-day persistence is wanted.
- **Why Tetris-drop instead of Space Invaders grid?** Grid formation caused a problem where legit emails in front rows blocked bullets from reaching spam behind them. Tried putting legit in top rows, but that still caused issues. Dropping individual emails from random positions solved it cleanly.
- **Why can't you "catch" legit emails?** Tried this mechanic, but it conflicted with the core loop. Having to both catch AND dodge creates confusing priorities. Simpler: shoot spam, ignore legit, catch rare VIP.
- **VIP emails (Nir, Avishai, Yaniv):** These are Wix leadership/founders. They're an easter egg that Wix employees will recognize. They should stay rare and rewarding.
- **Conference theme is "sport":** The competitive element is the leaderboard. The game itself is a single-player score attack. The "sport" aspect comes from players trying to beat each other's scores at the booth.
