# Math Stars

Browser maths-practice game for **9-year-olds and up**. Solo 20-question sets
that earn stars, plus a head-to-head 20-question "Star Race" against a friend
(Mathletics "Live Mathletics", but a fixed question count instead of a timer).
React 19 + Vite, two-player relay in `party/` (PartyKit), e2e via Playwright,
deployed to GitHub Pages.

**Read [`docs/BRIEF.md`](docs/BRIEF.md) first** — it is the source of truth for
product scope, architecture, the storage plan, the PartyKit message flow, the
Playwright approach, and the milestone order.

## Architecture spine (copied from the speed-racer repo)

- The only React store is a **phase machine** in `src/game/store.js`
  (`useSyncExternalStore`): `menu -> practice -> lobby -> countdown -> match -> result`.
- Opponent network state lives in a **mutable singleton** in `src/game/net.js`
  that the HUD samples — packets arrive 5-10 Hz and must not re-render the app.
  Everything else (current question, score, streak) is normal React state.
- The PartyKit server is a **dumb relay**. All scoring is client-side; the match
  result is each player's own locally-computed score. The server never sees a
  question or an answer.
- Both players in a race generate the **same 20 questions** from a server-sent
  `seed`.
- All persistence goes through the **async `Store` facade** in
  `src/game/persist/`. `sessionAdapter.js` (sessionStorage) for now; the real
  backend is a drop-in `remoteAdapter.js` later. Nothing else touches storage.
- Keys are versioned: `math-stars:v1:*`.

## Conventions

- Adding a skill is one object in the skills list (`src/game/skills.js`) with a
  `generate(rng)` function — no other wiring.
- Question generators take a seeded RNG so solo and head-to-head share one code
  path and a race is reproducible.
- No negative marking, no timers that punish — the audience is 9.

## Verify Before Declaring Done

For any change to scoring, question generation, or match sync: play it in the
browser preview and state what you observed before reporting success. Correctness
of the maths and the feel of the interaction are separate checks.
