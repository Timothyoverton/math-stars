# Math Stars

Browser maths-practice game for 9-year-olds and up. Solo 20-question sets to earn
stars, plus a head-to-head "Star Race" against a friend over a shared link.

React 19 + Vite, two-player relay in `party/` (PartyKit), e2e via Playwright,
deployed to GitHub Pages. Same architectural spine as the `speed-racer` repo.

**Read [`docs/BRIEF.md`](docs/BRIEF.md) first** — product, the storage plan
(sessionStorage now, pluggable adapter for a real backend later), repo layout,
PartyKit message flow, and milestones. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
is the how; [`docs/ROADMAP.md`](docs/ROADMAP.md) is what's next.

## Status

Milestones 1–4 built:

- **Solo practice** — pick a skill, 20 generated questions, number pad or
  multiple choice, live score / streak / speed bonus, result screen with stars,
  new-best flag, and a per-skill mastery view.
- **Curriculum** — 30 skills across grades 3–7 (Khan Academy K-8 scope) plus 5
  strand-level "mixed review" sets, grouped by grade in the picker. Adding one is
  a single object in `src/game/skills.js`.
- **Star Race** — host gets a join code + QR + `?join=` link, synced 3-2-1-GO,
  both players get the identical 20 questions from a server seed, live opponent
  HUD, winner (most correct, faster time breaks a tie), rematch.
- **Gem collection** — finish a set at or above the pass mark and earn a
  gemstone (common → special, 12 kinds), shown on the result screen and kept in
  a collection bag off the menu. See `src/game/gems.js` / `rewards.js`.
- **Play the Robot 🤖** — race a bot (Warm-up / Sharp / Turbo) when there's no
  second device — no relay, no lobby, straight to the countdown. See
  `src/game/bot.js`.
- **Polish** — a "get ready" warm-up (5 unscored questions) the first time you
  practise a skill, a synthesized chime + bigger celebration on a 3-star set /
  new best / race win, and a downloadable share-card image for a race win.
- **Playwright** — `practice.spec.js`, `rewards.spec.js`, `bot.spec.js`,
  `polish.spec.js` (green) and `match.spec.js` (needs a relay).

Next: milestone 5 (real backend) — see the roadmap.

## Commands

```bash
npm install
npm run dev            # dev server (5173)
npm run party:dev      # multiplayer relay, local (1999)
npm run lint
npm run build
npm run test:e2e       # Playwright (start party:dev first, or set PARTYKIT_HOST)
npm run deploy         # build + push dist/ to gh-pages
npm run party:deploy
```

The Star Race relay must be deployed once (`npm run party:deploy`) and its host
put in `src/game/net-config.js` before multiplayer works in production.
