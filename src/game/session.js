// The current student and the activity in progress, as a plain module.
//
// <Practice> and <Match> own the real per-answer state as ordinary React state
// and mirror a snapshot here each render. That gives non-React code (and the
// Playwright specs) a stable place to read `currentQuestion.answer`, the score,
// and progress without subscribing to component internals.

export const session = {
  profile: null, // { id, name, avatar, yearLevel } — hydrated from Store on boot

  // set while phase === 'practice' | 'match', else null
  activity: null,
}

// mode: 'solo' | 'race'
export function beginActivity({ mode, skillId, seed, questions }) {
  session.activity = {
    mode,
    skillId,
    seed,
    questions,
    total: questions.length,
    index: 0,
    score: 0,
    streak: 0,
    correct: 0,
    currentQuestion: questions[0] || null,
    done: false,
  }
  return session.activity
}

export function updateActivity(patch) {
  if (!session.activity) return
  Object.assign(session.activity, patch)
  session.activity.currentQuestion =
    session.activity.questions[session.activity.index] || null
}

export function endActivity() {
  if (session.activity) session.activity.done = true
}

export function clearActivity() {
  session.activity = null
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__session = session
}
