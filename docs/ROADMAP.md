# Math Stars — roadmap & ideas

The brief's milestones 1–4 are built (solo practice, Khan-aligned curriculum,
Star Race over PartyKit, Playwright), plus the gem collection reward loop,
Play the Robot, the rest of the curriculum, and the smaller polish items
below. The one thing left:

## Milestone 5 — real persistence (from the brief)

Pick a backend, write `remoteAdapter.js` against the `Store` contract, migrate
off `sessionStorage`, add a login token. Recommendation stands: **Supabase**
unless the product stays strictly single-student with no teacher view.

## Play the Robot 🤖 ✅ built

A **bot opponent** so a solo player can race without a second device:

- [`bot.js`](../src/game/bot.js)'s `runBot()` is a pure, seeded simulation —
  same shape as `net.js`'s `oppProgress` / `oppFinish` packets, so `<Match>` /
  `<Hud>` can't tell a bot from a real opponent. Three difficulty levels
  ("Warm-up robot", "Sharp robot", "Turbo robot") vary accuracy and
  per-question think-time.
- `mp.js`'s `playBot()` sets up `net.js`'s `session` singleton directly (no
  socket, no lobby — nothing to connect) and goes straight to the countdown.
  `<Match>` starts `runBot()` on mount when `session.botLevel` is set.
- The bot answers the same `buildQuestionSet(seed, skillId)` the player faces,
  so the HUD's "Q7/20" is honest, and its score uses the same `scoring.js`.
- Menu: **Practise 20 questions · 🏁 Race a friend · 🤖 Warm-up / Sharp /
  Turbo**. Result screen adapts its wording ("the robot" vs "your friend") and
  offers "Race the robot again" instead of a relay rematch.
- Tests: `tests/bot.spec.js` — `runBot()` determinism and level ordering,
  cancellation, and a full DOM playthrough to a race result.

This also de-risks the multiplayer demo when no relay is deployed.

## Gem collection — the reward loop ✅ built

Mathletics' hook: finish a test above a pass mark and a monkey scampers off with
your acorns into a stash. Math Stars' version: **you collect gemstones**.

Stars and gems coexist and mean different things — **stars** are the skill
rating (rolling mastery, the 60/80/95 % thresholds in `scoring.js`); **gems**
are the collectible you earn per set. The project keeps the name *Math Stars*;
gems are additive.

### Earning

A gem drops on the result screen. `src/game/rewards.js`'s `gemFor()` is a pure
function from how the set went to a tier — reusing the thresholds already in
`scoring.js`:

| Tier | Gem (12 total, `src/game/gems.js`) | Earned by |
| --- | --- | --- |
| Common | tiger's eye, quartz, agate | finish any set (≥ 60 %, 1 star) |
| Uncommon | amethyst, citrine, jade | 2-star set (≥ 80 %) |
| Rare | sapphire, emerald, ruby | 3-star set (≥ 95 %) |
| Epic | diamond | a perfect 20/20, **or** first time a skill hits full mastery |
| Special | star ruby, black opal | a Star Race win · a 10-streak · a new best score |

One gem per finished set, highest qualifying tier wins, the specific gem within
a tier is picked at random. A dud set (< 60 %) earns nothing.

### Where it landed

- `Store.recordActivity()` now also returns `prevStars`, so "first full
  mastery" is `prevStars < 3 && progress.stars === 3`. `Store.awardGem(id)` /
  `getCollection()` / `getGemCount()` round out the facade — new versioned key
  `math-stars:v1:collection`.
- `<Practice>` / `<Match>` call `gemFor()` right after recording the activity,
  award the gem, and pass it through as `result.gem`.
- `<Result>` shows the drop (a CSS gem-shape, name, tier, "New!" the first
  time) with a pop-in animation that respects `prefers-reduced-motion`.
- `<Collection>` — off the menu, next to "see progress" — a grid of gem slots
  grouped by tier, filled ones in colour with a ×count, unearned ones grey
  silhouettes. Tap one for its name/tier/count/first-earned date.
- Star Race: both players compute and award their own gem client-side off
  their own result — the relay still never sees a score.
- Tests: `tests/rewards.spec.js` — tier logic, `Store.awardGem` round-tripping,
  and a full DOM playthrough asserting the drop on the result screen.

### Deferred

- **The critter** — a small animated character running the gem into the bag.
  Shipped instead as a plain pop-in card; worth revisiting once the collection
  itself has been played with.
- **A cosmetic shop** — spend gems on avatar hats / question-card themes. Out
  of scope until the collection is proven fun.

## Curriculum depth (Khan Academy K-8 scope/sequence)

Current skills cover grades 3–7 arithmetic — 28 base skills plus 5 strand-level
mixed-review sets. Notes from <https://www.khanacademy.org/math/k-8-grades> on
what could be added, and what can't:

**Built this round** (`src/game/skills.js`):

| Grade | Unit | Skill | id |
| --- | --- | --- | --- |
| 4 | Place value | value of a digit — "the 8 in 6800" | `placevalue` |
| 4 | Division | divide with remainders → `q r r` (multiple choice) | `divrem` |
| 5 | Decimal place value | multiply / divide by 10, 100, 1000 | `powersoften` |
| 5 | Multiply decimals | `0.4 × 0.7` | `muldec` |
| 5 | Divide fractions | `¾ ÷ ½` (multiple choice, answer kept a proper fraction) | `fracdiv` |
| 6 | Ratios | equivalent ratios, `4 : 6 = 2 : ?` | `ratios` |
| 6 | Rates | unit rate — "60 points in 5 games → per 1" | `unitrate` |
| 7 | Negative numbers | multiply / divide negatives | `negmuldiv` |
| 7 | Proportions | proportion word problems | `proportions` |
| 7 | Percent | discount (percent off) word problems | `percentchange` |

Also added: **mixed-review sets** — one per strand (Multiplication & division,
Fractions, Decimals, Ratios & percentages, Negative numbers). Each is a normal
skill object whose `generate()` picks a member skill per question, so it needed
no change to `buildQuestionSet`. They show under "Mixed review" in the picker and
the progress view.

**Also built** (`addsubword`, `percentincrease`): grade-3 add/subtract word
problems (varied names/objects/phrasing over the same `add`/`sub` maths) and
grade-7 percent increase / tax / tip / "what percent of" (one skill, four
prompt shapes, mirroring the existing discount skill's style).

**Needs a diagram — out of scope for the generator model** (would need an SVG
question renderer): everything in the geometry, measurement, data & statistics,
coordinate-plane, and "fraction on a number line / area model" strands.

Structural idea worth stealing from Khan: **Unit → skill → mastery**. Math Stars
now has per-skill rolling mastery and the strand-level mixed sets; a true "unit
test" that gates progress could build on those.

## Smaller polish ✅ built

- **Celebration** — `src/game/celebrate.js`'s `playChime()` is a synthesized
  Web Audio triad (no audio asset), paired with `.celebrate-pop` in
  `index.css` (a scale + gold glow, no-ops under `prefers-reduced-motion`).
  `<Result>` fires both once for a 3-star set, a new best, or a race win.
- **"Get ready" warm-up** — a new `warmup` phase (`store.js`'s
  `startWarmup()`, `<Warmup>`) reuses `useQuiz` for 5 unscored questions from
  the same generator, then hands off to `startPractice()` for the real set.
  `<Menu>` routes here only for a skill with no `Store.getProgress()` entry
  yet; a "Skip warm-up" button is always available.
- **Shareable result card** — `src/game/shareCard.js`'s `renderShareCard()`
  draws a `<canvas>` PNG (no asset) on demand; `<Result>`'s win screen offers
  "Make a share card" → a downloadable image.
- **Night sky background** — an illustrated starry sky with gems along the
  ground (`src/assets/starry-night.webp`, 61 KB) on a fixed `.night` layer.
  Tried CSS-drawn first (tiled starfield + SVG facet gems) and it wasn't good
  enough; see ARCHITECTURE's "Look".

## Future ideas (not started)

- **Visual fraction manipulatives** — Tim (2026-09-11): for a fractions
  question like `1/2`, show a real picture (a glass filled halfway with
  water, a pizza with slices) instead of the plain `a/b` stack `MathExpr`
  draws today. Needs an actual image-generation service — hand-drawn SVG
  scenes have already come up short once this session (see the night-sky
  background note above; same lesson applies here, only more so, since a
  fraction picture has to be *legible* as "half full", not just pretty).
  Likely shape: pre-generate a small fixed set of images per denominator
  (halves, thirds, quarters, etc.) offline and ship them as assets, similar
  to how the starry background is a shipped `.webp` rather than drawn live —
  rather than calling a generation API from the client at runtime.
