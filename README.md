# Math Stars

Browser maths-practice game for 9-year-olds and up. Solo 20-question sets to earn
stars, plus a head-to-head "Star Race" against a friend over a shared link.

React 19 + Vite, two-player relay in `party/` (PartyKit), e2e via Playwright,
deployed to GitHub Pages. Same architectural spine as the `speed-racer` repo.

**Read [`docs/BRIEF.md`](docs/BRIEF.md) first** — product, the storage plan
(sessionStorage now, pluggable adapter for a real backend later), repo layout,
PartyKit message flow, and milestones.

## Status

Scaffold only. Milestone 1 (solo practice) is the next step — see the brief.

## Commands

```bash
npm run dev            # dev server (5173)
npm run party:dev      # multiplayer relay, local (1999)
npm run lint
npm run build
npm run deploy         # build + push dist/ to gh-pages
npm run party:deploy
npm run test:e2e
```
