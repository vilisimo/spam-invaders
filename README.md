# Spam Invaders

A browser-based arcade game built for the Wix Emails team booth at an engineering conference.

Players control a mailman ship and must distinguish between three types of falling emails: shoot the spam, let legitimate emails pass safely (or catch them), and catch VIP messages for bonus points. The game gets progressively harder with each level, and a combo system rewards quick reactions. When all lives are lost, players enter their name for a top-10 leaderboard — perfect for friendly competition at the booth.

Open `index.html` in a browser to play. No install or build step needed.

## Game Rules

### Email types
- **Spam** — shoot it. If it hits the mailman or reaches the inbox, you lose a life.
- **Legit (green)** — let it fall past OR catch it with the mailman; either delivers it for **+15 points**. Shooting it costs **−50 points**, a life, and resets your combo.
- **VIP** — catch it with the mailman for **+50 points and +1 life** (capped at 5). Missing a VIP has no penalty. Shooting a VIP costs **−100 points**, a life, and resets your combo.

### Scoring
- Spam kill: `10 × (1 + floor(combo / 3))` — scales with combo, not level.
- Legit delivered: **+15** (fixed).
- VIP caught: **+50** (fixed).
- Level-up bonus: **+ (level × 30)** awarded on clearing a level.
- Combo chain of 3+ spam kills triggers a combo flash and bonus multiplier; combo resets on any penalty.

### Progression
- Difficulty ramps each level: faster fall speed, shorter spawn intervals, more emails required to clear, and a higher legit ratio.
- Per-action points are **not** level-scaled — higher levels pay off via the level-up bonus and more combo opportunities.

### Lives & game over
- Start with 3 lives (max 5 via VIPs).
- Reach 0 lives → game over → enter your name (up to 12 chars) for the top-10 leaderboard.
