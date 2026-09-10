# Math Stars — project brief

A browser maths-practice game for **9-year-olds and up** (upper primary, roughly
Year 4 and beyond). Students work through question sets solo to build mastery and
earn stars, then challenge a friend to a **head-to-head 20-question race** — the
Mathletics "Live Mathletics" idea, but a fixed 20 questions instead of a 60-second
timer.

This repo copies the **essence of `speed-racer`**: the same stack and the same
architectural spine, aimed at a quiz game instead of a driving game.

---

## 1. What we're carrying over from speed-racer

| From speed-racer | How it maps to Math Stars |
| --- | --- |
| React 19 + Vite, deployed to GitHub Pages | same |
| PartyKit relay in `party/`, `partysocket` client | same — pairs two students, syncs the start, relays progress |
| One React store = a **phase machine** (`useSyncExternalStore` in `game/store.js`); everything else is plain modules | same split. Phases: `menu → practice → lobby → countdown → match → result` |
| Hot-path state in mutable singletons the render loop writes, React never re-renders on (`carState`, `hud`, `net`) | **only `net.js`** needs this — opponent packets arrive 5–10 Hz and shouldn't trigger a re-render each. Everything else (current question, score, streak) is fine as normal React state; a quiz has no 60 fps loop |
| PartyKit server is a **dumb relay** — all game logic client-side; the result is each player's **own locally-computed** score | same. No server-authoritative scoring in the prototype |
| Lobby = join code + QR + deep link (`?join=CODE`), synced countdown (`startAt = now + 3200ms`) | same, verbatim pattern |
| Deep-link mismatch (wrong track) → stash intent in `sessionStorage`, reload, resume — `bootstrapMultiplayer()` | same, for skill mismatch instead of track |
| Two-player identity dedupe (guest auto-moved off a clashing car colour) | same, for avatar |
| Playwright: headed on a real display, dev build (needs dev globals), **multiplayer specs hit the deployed relay** (local `partykit dev` gets SIGTERM'd in this environment) | same — see `docs/playwright-plan.md` in speed-racer for the hard-won details |
| Node at `~/.local/node/bin`; Playwright browsers to `~/.cache/ms-playwright` | same |
| "Verify before declaring done" — drive the change, state what you observed | same discipline: for any scoring / question-generation / match-sync change, actually play it in the browser preview first |

## 2. What we are NOT carrying over

three.js, `@react-three/fiber`, `@react-three/rapier`, the render loop, `SkyDome`,
the autopilot, the fixed-timestep `st.advance()` harness, medal-time derivation.
Math Stars is a plain DOM app — no canvas, no physics.

---

## 3. Product

**Solo practice**
- Student picks a skill (e.g. "Multiplication facts to 12×12").
- 20 questions, generated on the fly. Number-pad or multiple-choice input.
- Live feedback per answer; running score, streak, and a progress bar.
- Result screen: score, accuracy, time, **stars earned**, new best flagged.
- Progress rolls up into a mastery view (per skill: accuracy, stars, best).

**Head-to-head ("Star Race")**
- Host picks a skill, gets a join code + QR. Friend scans / opens the link.
- Both tap Ready → synced 3-2-1-GO countdown.
- Both players get the **identical 20 questions** (seeded RNG from a server-sent
  `seed`), answered at their own pace — it's a race to finish.
- HUD shows the opponent's progress (question 7 of 20) and score, like
  speed-racer's gap indicator.
- Finish → each client sends `{ correct, score, timeMs }`; both sides compute the
  same result: **winner = more correct, tiebreak faster time**.
- Rematch button → back to lobby, same pattern as speed-racer.

**Scoring** (Live-Mathletics flavour)
- +10 per correct answer.
- Speed bonus: +5 if answered under 3 s, +2 if under 6 s.
- Streak multiplier: ×1.5 at a 5-streak, ×2 at a 10-streak.
- Wrong answer: 0 points, streak resets. No negative marking (they're 9).

**Curriculum** — start with ~6 skills, flat list, each:
```
{ id, label, strand, minYear, generate(rng) -> { prompt, answer, choices? } }
```
Seed set: addition, subtraction, ×-facts, ÷-facts, fractions of a quantity,
order of operations. Mastery = rolling accuracy over the last ~20 attempts;
stars at 60 / 80 / 95 %.

---

## 4. The storage problem (the point of this brief)

Everything persistent goes through **one async facade** so the real backend is a
drop-in later. Nothing else in the app touches storage directly.

```js
// src/game/persist/index.js
export const Store = {
  getProfile(),                 // -> { id, name, avatar, yearLevel } | null
  setProfile(patch),
  getProgress(),                // -> { [skillId]: { attempts, correct, mastery, stars, best } }
  recordActivity(result),       // append to history + roll into progress
  getHistory({ limit }),
  getStars(),                   // total across all skills
}
```

Every method is `async` **even though `sessionStorage` is synchronous** — so
swapping in a network adapter never touches a caller.

```js
// adapter contract — that's all an adapter is
{ read(key): Promise<any>, write(key, value): Promise<void>, remove(key): Promise<void> }
```

`Store` is built on top of one adapter, selected in `index.js` (or by
`VITE_STORE`):

```
persist/
  index.js            Store facade, picks the adapter
  sessionAdapter.js   sessionStorage-backed        <- NOW
  memoryAdapter.js    in-memory, for tests
  remoteAdapter.js    (later)
  README.md           "how to add the real backend"
```

- **Keys are versioned**: `math-stars:v1:profile`, `math-stars:v1:progress`. A
  schema change bumps `v1` and migrates (or discards) cleanly.
- **`sessionStorage` now** = progress is lost when the tab closes. That's an
  acceptable prototype cost and it stops "do the backend later" becoming "never".
  Switching to `localStorage` is a one-line change in the adapter if you want
  progress to survive a reload before the real backend lands.

**Solving it later — the options**
1. **PartyKit room storage** — a Durable Object per student keyed by a login
   token; `party.storage.put/get`, plus an `onRequest` HTTP handler for reads.
   Natural fit since PartyKit is already deployed. Best if it stays student-only.
2. **Supabase** — Postgres + auth + row-level security, big free tier. Best if
   teacher/class dashboards are coming (they usually are for a school product).
3. **Cloudflare KV / D1** — PartyKit deploys to Cloudflare anyway.

Recommendation: build `remoteAdapter.js` against **Supabase** when you get there,
unless the product stays strictly single-student with no teacher view.

---

## 5. Repo structure

```
math-stars/
  src/
    App.jsx
    main.jsx
    game/
      store.js            phase machine (useSyncExternalStore)
      session.js          current student + current activity (plain module)
      questions.js        seeded generators per skill
      skills.js           curriculum data
      scoring.js          points / streak / speed bonus / stars
      persist/            Store facade + adapters (section 4)
      net.js              PartyKit transport + opponent singleton (relay only)
      net-config.js       PARTYKIT_HOST
      mp.js               glue: net events -> store transitions
    components/
      Menu.jsx  Practice.jsx  Question.jsx  Numpad.jsx
      Lobby.jsx  Countdown.jsx  Match.jsx  Hud.jsx  Result.jsx
      Progress.jsx        mastery / stars view
  party/
    server.ts             relay: pair, sync start (+ seed), relay progress/finish, rematch
  tests/
    helpers.js  practice.spec.js  match.spec.js
  docs/
    BRIEF.md              this file
    ARCHITECTURE.md       write this like speed-racer's, once the shape settles
  playwright.config.js  partykit.json  vite.config.js  package.json
```

## 6. PartyKit message flow (copied from speed-racer, quiz-shaped)

`onConnect` — max 2; first is host, gets slot 1.
`hello {name, avatar, skillId}` — host's `skillId` wins; server replies `joined`,
broadcasts roster.
`ready {value}` — when both ready, server sets `startAt = Date.now() + 3200` and a
random `seed`, broadcasts `start {startAt, seed, skillId}`.
`progress {q, score}` — relayed untouched as `oppProgress` (rate-limit client-side
to ~5 Hz).
`finish {correct, score, timeMs}` — relayed as `oppFinish`.
`rematch` — reset roster ready flags, broadcast; both clients return to lobby.
`onClose` — drop the player, reset the other, broadcast `oppLeft`.
Idle-room timeout ~15 min, as in speed-racer.

Both clients build the same 20 questions from `seed` — the server never sees a
question or an answer.

## 7. Playwright specs

- **`practice.spec.js`**: start a practice set, loop 20× reading
  `window.__session.currentQuestion.answer` and entering it, assert the result
  screen shows a score, stars are awarded, and `sessionStorage['math-stars:v1:progress']`
  updated.
- **`match.spec.js`**: two `browser.newContext()` (Alice, Bob). Alice hosts, reads
  the code. Bob `goto('/?join=CODE')`, both reach the lobby with 2 players, both
  Ready, both hit `phase === 'match'`. Assert both clients' first question
  `prompt` is identical (proves the seed sync). Drive both to finish, assert the
  Result shows a winner and both scores. Rematch → both back in lobby.
- Dev globals to expose (dev build only): `window.__store`, `window.__session`,
  `window.__net`.
- `playwright.config.js` `webServer` auto-starts `npm run dev`; multiplayer spec
  points at the **deployed** relay.

## 8. Milestones

1. **Scaffold** — Vite + React, phase machine, one skill, solo 20-question
   practice, `sessionAdapter`, stars on the result screen. No multiplayer.
2. **Curriculum** — 6 skills, skill picker, mastery/progress view.
3. **Head-to-head** — PartyKit relay, lobby + QR + deep link, synced countdown,
   seeded shared questions, live opponent HUD, result, rematch. Deploy the relay.
4. **Playwright** — `practice` + `match` specs, headed, deployed relay for the
   match spec.
5. **Persistence (the "later")** — pick a backend, write `remoteAdapter.js`,
   migrate off `sessionStorage`, add a login token.

## 9. Commands (target)

```bash
npm run dev            # game dev server (5173)
npm run party:dev      # relay, local (1999)  — note: dies under some sandboxes
npm run lint
npm run build
npm run deploy         # build + push to gh-pages
npm run party:deploy
npm run test:e2e
```
