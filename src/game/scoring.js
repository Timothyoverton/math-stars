// Live-Mathletics-flavoured scoring. No negative marking, no punishing timer —
// the audience is 9.
//
//   +10 per correct answer
//   speed bonus: +5 under 3s, +2 under 6s
//   streak multiplier: ×1.5 at a 5-streak, ×2 at a 10-streak
//   wrong answer: 0 points, streak resets

export const BASE_POINTS = 10

export function speedBonus(timeMs) {
  if (timeMs < 3000) return 5
  if (timeMs < 6000) return 2
  return 0
}

export function streakMultiplier(streak) {
  if (streak >= 10) return 2
  if (streak >= 5) return 1.5
  return 1
}

// Score for one answered question. `streakAfter` is the streak *including* this
// answer (so a correct 5th in a row already gets ×1.5).
export function pointsFor({ correct, timeMs, streakAfter }) {
  if (!correct) return 0
  const raw = (BASE_POINTS + speedBonus(timeMs)) * streakMultiplier(streakAfter)
  return Math.round(raw)
}

// Stars for a finished set / race, from its accuracy. Mirrors the mastery
// thresholds so "3 stars" means the same thing everywhere.
export function starsForAccuracy(accuracy) {
  if (accuracy >= 0.95) return 3
  if (accuracy >= 0.8) return 2
  if (accuracy >= 0.6) return 1
  return 0
}

export const MASTERY_WINDOW = 20
export const STAR_THRESHOLDS = [0.6, 0.8, 0.95]
