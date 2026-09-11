# Math Stars — architecture

Written like speed-racer's, once the shape settled. Read
[`BRIEF.md`](BRIEF.md) first for product scope and the storage plan.

## The spine

```
menu ─▶ practice ─▶ result                          solo
  └───▶ lobby ─▶ countdown ─▶ match ─▶ result        Star Race
```

- **One React store** — [`src/game/store.js`](../src/game/store.js), a phase
  machine sampled with `useSyncExternalStore`. It holds `phase`, the picked
  `skillId`, a `runId` (bumped to force a fresh `<Practice>` / `<Match>` mount),
  a `multiplayer` flag, and the `result` payload. Nothing per-answer lives here.
- **Per-answer state is ordinary React state** inside `<Practice>` / `<Match>`,
  driven by the shared [`useQuiz`](../src/game/useQuiz.js) hook. A quiz has no
  per-frame loop, so this doesn't need the out-of-React treatment.
- **`src/game/session.js`** is a plain module mirroring a snapshot of the
  running activity (`currentQuestion`, `score`, `index`…). Non-React code and
  the Playwright specs read `window.__session.activity` from here.
- **`src/game/net.js`** is the only out-of-React singleton — opponent
  progress/finish packets land on `netState`, which `<Hud>` samples on a 300ms
  timer so a packet never re-renders the quiz.

## Questions & scoring

- [`skills.js`](../src/game/skills.js) — the curriculum. **Adding a skill is one
  object with a `generate(rng)`**; nothing else. Grades 3–7, arithmetic only
  (geometry/data strands need diagrams — out of scope for a generated quiz).
- [`rng.js`](../src/game/rng.js) — `mulberry32` + a small toolkit (`int`, `pick`,
  `shuffle`). Every generator is seeded, so solo and race share one code path and
  a race is reproducible.
- [`questions.js`](../src/game/questions.js) — `buildQuestionSet(seed, skillId)`
  builds all 20 up front (light de-dup). `isCorrect` is numeric-tolerant and
  understands fraction equivalence (`2/4` = `1/2`).
- [`scoring.js`](../src/game/scoring.js) — +10 per correct, speed bonus
  (+5 <3s, +2 <6s), streak multiplier (×1.5 at 5, ×2 at 10), wrong = 0 and the
  streak resets. Stars at 60 / 80 / 95 % accuracy — same thresholds for a set's
  stars and for rolling mastery.

## Gem collection

The reward loop on top of stars — collectible, not a second scoring system.
- [`gems.js`](../src/game/gems.js) — the gem list, data only: 12 gems across
  five tiers (common/uncommon/rare/epic/special).
- [`rewards.js`](../src/game/rewards.js) — `gemFor(input, pick?)`, a pure
  function from how a set went (`stars`, `perfect`, `firstFullMastery`,
  `raceWin`, `tenStreak`, `newBest`) to a gem id or `null`. No storage, no
  React — `pick` is injectable so tests can make the tier-internal choice
  deterministic.
- `<Practice>` / `<Match>` call `gemFor()` right after `Store.recordActivity()`
  (which now also returns `prevStars`, so "first full mastery" is a one-line
  check), then `Store.awardGem(id)` and pass the result through `finishActivity`
  / `finishMatch` as `result.gem`. `<Result>` shows the drop; `<Collection>`
  (off the menu, next to "see progress") is the gem-bag screen.
- Star Race: both players compute their own gem client-side off their own
  `self` result — the relay still never sees a score.

## Play the Robot 🤖

A bot opponent for Star Race, for when there's no second device. Deliberately
built to need **no changes to `<Match>`, `<Hud>`, or `<Countdown>`**:
- [`bot.js`](../src/game/bot.js) — pure, dependency-free, seeded from the
  race's `seed` like every generator. `runBot({ seed, skillId, level,
  questions, onProgress, onFinish })` simulates the bot answering one question
  at a time (a think-time drawn from `level.thinkMs`, right/wrong drawn from
  `level.accuracy`, scored with `scoring.js`) and calls `onProgress`/`onFinish`
  in exactly the shape `net.js`'s `oppProgress`/`oppFinish` packets already
  have. `BOT_LEVELS` holds the three difficulties (Warm-up/Sharp/Turbo).
- `mp.js`'s `playBot(skillId, levelId)` sets up `net.js`'s exported `session`
  singleton directly (`Object.assign(net.session, {...})`) — no socket, so
  there's nothing to connect and no lobby to wait in — and jumps straight to
  `startMatchCountdown()`.
- `<Match>` starts `runBot()` on mount whenever `net.session.botLevel` is set,
  writing its packets straight into `net.netState` and firing `net.emit`
  (exported from `net.js` alongside `on`/`off` for exactly this) — the same
  event `<Match>`'s own `oppFinish` listener already handles.
- `<Result>` reads `result.isBot` to swap "your friend" for "the robot" in its
  wording and offer "Race the robot again" (calls `playBot` again) instead of
  the relay's `sendRematch()`.

## Get-ready warm-up

A `warmup` phase, between `menu` and `practice`, that `<Menu>` routes into
only for a skill with no `Store.getProgress()` entry yet (never played). 5
unscored questions from the skill's own generator, reusing `useQuiz` (so it
mirrors into `session.activity` exactly like `<Practice>` does — no special
casing for tests or tooling). It deliberately does **not** call
`startPractice()` from `useQuiz`'s own `onFinish` — that fires synchronously
inside the last answer's click handler, which raced the very component
unmount that transition causes. Instead a `useEffect` watches `quiz.finished`
and hands off after a short `setTimeout`, the same pattern `<Countdown>`
already uses for its GO! → `beginMatch()` pause.

## Celebration & the share card

- [`celebrate.js`](../src/game/celebrate.js) — `playChime()`, a synthesized
  Web Audio triad (no audio asset). `<Result>` calls it once when a result is
  a 3-star set, a new best, or a race win, paired with `.celebrate-pop` in
  `index.css` (scale + gold glow on the headline/stars, a no-op under
  `prefers-reduced-motion`).
- [`shareCard.js`](../src/game/shareCard.js) — `renderShareCard()` draws a
  result-card PNG on a `<canvas>` (no image asset) and returns a data URL.
  `<Result>`'s race-win screen offers "Make a share card" → an `<img>` preview
  and a download link, built on demand rather than on every win.

## Look — starry sky background

The outer page (behind the white `.panel` card) is a CSS-only night sky, same
"no image assets" rule as the gems and the share card: two tiled
`radial-gradient` layers on `body::before` draw the stars (a dense dim tile
and a sparser bright one, `twinkle` opacity animation, off under
`prefers-reduced-motion`), and a fixed `.ground-gems` strip in `index.html`
scatters a handful of the real gem-tier colours as small `.gem-stone`-style
diamonds along the bottom edge, `pointer-events: none` throughout so it never
intercepts a tap.

## Star Race (PartyKit)

The server ([`party/server.ts`](../party/server.ts)) is a **dumb relay** — max
two per room, first is host. It pairs players, carries the host's `skillId`,
picks one `startAt` + `seed` when both are ready, and relays `progress` /
`finish` packets. It never sees a question or an answer; each player's result is
their own locally-computed score, and both build the identical 20 questions from
the shared `seed`.

Message flow: `hello` → `joined` + `roster` · `ready` (both) → `start
{startAt, seed, skillId}` · `progress {q, score}` → `oppProgress` · `finish
{correct, score, timeMs}` → `oppFinish` · `rematch` → both back to lobby ·
`onClose` → `oppLeft`. `ping`/`pong` gives a clock offset so the countdown lands
together. Idle rooms close after 15 min.

- [`net-config.js`](../src/game/net-config.js) — `127.0.0.1:1999` in dev,
  `math-stars.<user>.partykit.dev` in prod (or `VITE_PARTYKIT_HOST`).
- [`mp.js`](../src/game/mp.js) — glue: `?join=CODE` bootstrap, host/join, avatar
  dedupe, net events → store transitions.

## Persistence

Everything goes through the async **`Store` facade**
([`src/game/persist/`](../src/game/persist/)). `sessionAdapter` (sessionStorage)
now; `memoryAdapter` for tests (`VITE_STORE=memory`); `remoteAdapter` later.
Keys are `math-stars:v1:*` — profile, progress, history, and (new) collection.
See [`persist/README.md`](../src/game/persist/README.md).

## Tests

Playwright, headed on `:0` by default (`PW_HEADLESS=1` to skip the display).
`practice.spec.js` runs a solo set through the dev globals and asserts score,
stars, streak reset, generator sanity across every skill (including that no
multiple-choice question has duplicate choices), seed determinism, and
`sessionStorage` progress. `rewards.spec.js` checks `gemFor()`'s tier logic
directly, `Store.awardGem()`/`getCollection()` round-tripping, and a full DOM
playthrough that asserts the gem drop on the result screen and in storage.
`bot.spec.js` checks `runBot()`'s determinism and level ordering, that
cancelling it stops `onFinish` firing, and a full DOM playthrough of a bot
race to a result. `polish.spec.js` checks the warm-up phase (fires for a
never-played skill, skips for one with progress, doesn't touch progress
itself) and that a bot race win offers a downloadable share card.
`match.spec.js` drives two contexts through the relay
(shared questions, synced start, winner, rematch) and **skips itself** if no
relay is reachable — run `npm run party:dev` in another terminal, or point
`PARTYKIT_HOST` at the deployed relay.

## Dev globals (dev build only)

`window.__store` (`getState` / `setState` / `Store`), `window.__session`,
`window.__net` (`netState` / `session` / `connect` / …).
