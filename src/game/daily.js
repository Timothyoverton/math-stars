// The Daily Challenge: one fixed 20-question set, the same for every player
// on a given calendar day, no server involved — the date itself is the seed,
// same trick a race uses with its server-sent seed (see questions.js).
//
// The featured skill rotates through BASE_SKILLS by day-of-epoch, so it's
// deterministic (today's skill is always today's skill, on reload or on a
// different device) without persisting anything.

import { BASE_SKILLS } from './skills.js'

// The player's own calendar day, not UTC — the challenge should flip over at
// their midnight, not Greenwich's.
export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Days since the Unix epoch for a "YYYY-MM-DD" key, computed from UTC
// midnight so it's stable and doesn't care about the reader's own timezone.
function dayIndex(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function dailySkill(dateKey = todayKey()) {
  const idx = ((dayIndex(dateKey) % BASE_SKILLS.length) + BASE_SKILLS.length) % BASE_SKILLS.length
  return BASE_SKILLS[idx]
}

// The seed buildQuestionSet(...) should use for a given day — never adaptive
// (no ctx), so "today's challenge" means the same 20 questions for everyone
// who plays it, like a race's shared seed.
export function dailySeed(dateKey = todayKey()) {
  return `daily:${dateKey}`
}
