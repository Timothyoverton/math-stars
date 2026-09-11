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
