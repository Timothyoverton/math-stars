// Pure reward logic: what gem (if any) a finished set earns. No storage, no
// React — `gemFor()` takes a plain description of how the set went and
// returns a gem id or null, so it's trivially testable like scoring.js.
//
// Tier order mirrors docs/ROADMAP.md "Gem collection":
//   common    finish any set, pass mark (≥60%, 1 star)
//   uncommon  2-star set (≥80%)
//   rare      3-star set (≥95%)
//   epic      a perfect 20/20, or the first time a skill hits full mastery
//   special   a Star Race win, a 10-streak, a new best score
//
// A dud set (0 stars, <60%) earns nothing. One gem per finished set — the
// highest tier that applies wins; within a tier the gem is picked at random.

import { GEMS_BY_TIER } from './gems.js'

export function randomPick(list, rng = Math.random) {
  return list[Math.floor(rng() * list.length)]
}

// input:
//   stars            — stars earned on this set (0-3, from starsForAccuracy)
//   perfect          — every question answered correctly
//   firstFullMastery — this skill just reached 3-star rolling mastery for the
//                       first time (was <3 before this set, is 3 now)
//   raceWin          — this was a Star Race and this player won (or the
//                       opponent left, which counts as a win)
//   tenStreak        — a 10-question correct streak was reached this set
//   newBest          — this set beat the previous best score for the skill
//   pick             — injectable for tests; defaults to a random pick
export function gemFor(
  { stars, perfect, firstFullMastery, raceWin, tenStreak, newBest },
  pick = randomPick,
) {
  if (!stars || stars <= 0) return null

  let tier
  if (raceWin || tenStreak || newBest) tier = 'special'
  else if (perfect || firstFullMastery) tier = 'epic'
  else if (stars >= 3) tier = 'rare'
  else if (stars >= 2) tier = 'uncommon'
  else tier = 'common'

  const options = GEMS_BY_TIER[tier]
  return options && options.length ? pick(options).id : null
}
