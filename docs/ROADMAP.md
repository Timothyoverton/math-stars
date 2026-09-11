# Math Stars — roadmap & ideas

The brief's milestones 1–4 are built (solo practice, Khan-aligned curriculum,
Star Race over PartyKit, Playwright), plus the gem collection reward loop
below. What's next, roughly in order:

## Milestone 5 — real persistence (from the brief)

Pick a backend, write `remoteAdapter.js` against the `Store` contract, migrate
off `sessionStorage`, add a login token. Recommendation stands: **Supabase**
unless the product stays strictly single-student with no teacher view.

## Play a Friend · Play the Robot 🤖

The race screen currently only offers "Race a friend". Add a **bot opponent** so
a solo player can race without a second device:

- A `botAdapter` that stands in for `net.js` on the opponent side — no socket,
  same `oppProgress` / `oppFinish` shape.
- The bot answers on a timer with a per-question think-time drawn from a
  distribution, and a target accuracy — expose 2–3 difficulty levels
  ("Warm-up robot", "Sharp robot", "Turbo robot").
- It builds its questions from the same `seed`, so the HUD's "Q7/20" is honest.
- Menu becomes: **Practice · Play a Friend · Play the Robot 🤖**.

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

**Still open — good candidates for a generated (text-only) question:**

| Grade | Unit | Skill idea |
| --- | --- | --- |
| 3 | Add/subtract within 1000 | word-problem phrasing variants |
| 7 | Percent | percent *increase*, tax/tip, "what percent of" |

**Needs a diagram — out of scope for the generator model** (would need an SVG
question renderer): everything in the geometry, measurement, data & statistics,
coordinate-plane, and "fraction on a number line / area model" strands.

Structural idea worth stealing from Khan: **Unit → skill → mastery**. Math Stars
now has per-skill rolling mastery and the strand-level mixed sets; a true "unit
test" that gates progress could build on those.

## Smaller polish

- Sound + a bigger celebration on a new best / 3-star set.
- "Get ready" warm-up: 5 easy questions before a full set for a cold skill.
- A shareable result card image for a Star Race win.
