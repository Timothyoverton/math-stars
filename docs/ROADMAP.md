# Math Stars — roadmap & ideas

The brief's milestones 1–4 are built (solo practice, Khan-aligned curriculum,
Star Race over PartyKit, Playwright). What's next, roughly in order:

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

## Gem collection — the reward loop

Mathletics' hook: finish a test above a pass mark and a monkey scampers off with
your acorns into a stash. Math Stars' version: **you collect gemstones**, and a
little critter delivers each one into your **collection bag**.

Stars and gems coexist and mean different things — **stars** are the skill
rating (rolling mastery, the 60/80/95 % thresholds in `scoring.js`); **gems**
are the collectible you earn per set. The project keeps the name *Math Stars*;
gems are additive.

### Earning

A gem drops on the result screen, tier set by how the set went — reuse the
thresholds already in `scoring.js` (`starsForAccuracy`, mastery, best):

| Tier | Gem (examples) | Earned by |
| --- | --- | --- |
| Common | tiger's eye, quartz, agate | finish any set (≥ 60 %, 1 star) |
| Uncommon | amethyst, citrine, jade | 2-star set (≥ 80 %) |
| Rare | sapphire, emerald, ruby | 3-star set (≥ 95 %) |
| Epic | diamond | a perfect 20/20, **or** first time a skill hits full mastery |
| Special | star ruby, black opal | a Star Race win · a 10-streak · a new best score |

One gem per finished set (plus any special), so the bag fills at a sane rate.
A dud set (< 60 %) earns nothing — that's the pass mark, same as the acorn idea.

### The critter

At the result screen a small animated character (monkey, magpie, a little
mining mole — pick one) runs in, picks up the gem, and drops it in the bag with
a clink. Pure CSS/SVG keyframes, skippable, respects `prefers-reduced-motion`.
This is where the "celebration on a 3-star set" polish item below lands.

### Collection bag

A new screen off the menu (next to "see progress"): a grid of gem slots, filled
ones in colour with a count badge, unearned ones as grey silhouettes so there's
something to chase. Tap a gem → its name, how you earned it, when, and how many
you have. A headline count ("23 gems · 4 of 12 kinds found").

### Where it plugs in

- Extend the `Store` facade: `getCollection()`, and award inside
  `recordActivity()` (it already computes stars / newBest / mastery). New
  versioned key `math-stars:v1:collection` — `{ [gemId]: { count, firstAt, lastAt } }`.
- `src/game/gems.js` — the gem list (id, name, tier, colour, `svg`), mirroring
  how `skills.js` works: data only, one object per gem.
- `src/game/rewards.js` — pure function `gemFor(result) -> gemId | null`, unit
  tested like `scoring.js`.
- `<Result>` shows the drop; `<Collection>` is the new screen.
- Star Race: the winner earns their gem client-side on the result screen (the
  relay stays dumb — it never sees a score).

### Later still

Spend gems? A cosmetic shop (avatar hats, question-card themes) keeps it
non-pay-to-win and gives the currency a sink. Out of scope until the collection
itself is proven fun.

## Curriculum depth (Khan Academy K-8 scope/sequence)

Current skills cover grades 3–7 arithmetic. Notes from
<https://www.khanacademy.org/math/k-8-grades> on what could be added, and what
can't:

**Good candidates for a generated (text-only) question:**

| Grade | Unit | Skill idea |
| --- | --- | --- |
| 3 | Add/subtract within 1000 | word-problem phrasing variants |
| 4 | Place value | "value of the digit 7 in 4 <b>7</b> 2 5" |
| 4 | Division | divide with remainders → answer as `q r r` |
| 5 | Decimal place value | multiply / divide by powers of ten |
| 5 | Multiply decimals | `0.4 × 0.7` |
| 5 | Divide fractions | `¾ ÷ ½` (multiple choice) |
| 6 | Ratios | equivalent ratios, `4:6 = 2:?` |
| 6 | Rates | unit rate — "$12 for 4 → per 1" |
| 6 | Negative numbers | multiply / divide negatives |
| 7 | Proportions | solve `a/b = c/x` |
| 7 | Percent | percent increase / discount word problems |

**Needs a diagram — out of scope for the generator model** (would need an SVG
question renderer): everything in the geometry, measurement, data & statistics,
coordinate-plane, and "fraction on a number line / area model" strands.

Structural idea worth stealing from Khan: **Unit → skill → mastery**, with a
short "unit test" (a mixed set drawing from several skills in a strand). Math
Stars already has per-skill rolling mastery; a strand-level mixed set is a small
addition to `buildQuestionSet`.

## Smaller polish

- Sound + a bigger celebration on a new best / 3-star set.
- "Get ready" warm-up: 5 easy questions before a full set for a cold skill.
- A shareable result card image for a Star Race win.
