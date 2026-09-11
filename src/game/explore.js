// Explore Mode's map/stop/progression model — see docs/EXPLORE_MODE.md.
//
// A map is one grade tier from SKILLS_BY_GRADE; a stop is one skill in that
// map, in declaration order; every map ends with one "check" node that mixes
// questions across the whole map. This reuses makeRng directly rather than
// buildQuestionSet, since mixing questions across more than one skill doesn't
// fit that function's one-skill-per-seed contract — and buildQuestionSet
// must stay untouched so races/daily/solo practice can't accidentally
// inherit explore-only behaviour.

import { SKILLS_BY_GRADE } from './skills.js'
import { makeRng } from './rng.js'

export const STOP_QUESTIONS = 10
export const REVIEW_FRACTION = 0.2
export const CHECK_PASS_FRACTION = 0.5

// Maps in ascending grade order, each { grade, skills }.
export const EXPLORE_MAPS = Object.keys(SKILLS_BY_GRADE)
  .map(Number)
  .sort((a, b) => a - b)
  .map((grade) => ({ grade, skills: SKILLS_BY_GRADE[grade] }))

// Every node on a map's path: its skill stops, then one "check" node.
export function mapNodes(map) {
  return [...map.skills.map((skill) => ({ type: 'stop', skill })), { type: 'check', map }]
}

// Stable key for a node's results/frontier bookkeeping.
export function nodeKey(map, node) {
  return node.type === 'check' ? `${map.grade}:check` : `${map.grade}:${node.skill.id}`
}

// Every skill from maps strictly before mapIndex — the review pool for a
// stop's 20%. Empty for the first map: no earlier map to review yet.
export function reviewPool(mapIndex) {
  return EXPLORE_MAPS.slice(0, mapIndex).flatMap((m) => m.skills)
}

function pushUnique(rng, out, seen, genFn) {
  let q
  let guard = 0
  do {
    q = genFn(rng)
    guard++
  } while (seen.has(q.prompt) && guard < 20)
  seen.add(q.prompt)
  out.push({ prompt: q.prompt, answer: q.answer, choices: q.choices || null })
}

// A stop's question set: 80% the stop's own skill, 20% drawn from an
// earlier map's skills (0% if reviewSkills is empty — the first map).
export function buildStopQuestionSet(seed, skill, reviewSkills, count = STOP_QUESTIONS) {
  const rng = makeRng(`${seed}:${skill.id}:explore-stop`)
  const reviewCount = reviewSkills.length ? Math.round(count * REVIEW_FRACTION) : 0
  const newCount = count - reviewCount
  const out = []
  const seen = new Set()
  for (let i = 0; i < newCount; i++) pushUnique(rng, out, seen, (r) => skill.generate(r))
  for (let i = 0; i < reviewCount; i++) {
    const revSkill = rng.pick(reviewSkills)
    pushUnique(rng, out, seen, (r) => revSkill.generate(r))
  }
  return rng.shuffle(out)
}

// A map's Check node: questions spread evenly across every skill in the map.
export function buildCheckQuestionSet(seed, map, count = STOP_QUESTIONS) {
  const rng = makeRng(`${seed}:${map.grade}:explore-check`)
  const out = []
  const seen = new Set()
  for (let i = 0; i < count; i++) {
    const skill = rng.pick(map.skills)
    pushUnique(rng, out, seen, (r) => skill.generate(r))
  }
  return out
}

// Where completing the node at (mapIndex, nodeIndex) moves the frontier to —
// null if that wasn't the frontier (replaying an earlier node never moves
// anything) or if a check was failed (stays put; try again, no punishment
// beyond that — see the house "no negative marking" rule). `passed` is only
// consulted for a check node.
export function nextFrontier(frontier, mapIndex, nodeIndex, passed) {
  if (frontier.mapIndex !== mapIndex || frontier.nodeIndex !== nodeIndex) return null
  const node = mapNodes(EXPLORE_MAPS[mapIndex])[nodeIndex]
  if (node.type === 'check') {
    if (!passed) return null
    if (mapIndex + 1 >= EXPLORE_MAPS.length) return frontier // last map — nothing further
    return { mapIndex: mapIndex + 1, nodeIndex: 0 }
  }
  return { mapIndex, nodeIndex: nodeIndex + 1 }
}
