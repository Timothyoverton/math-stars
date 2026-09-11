// "Play the Robot" — a bot opponent for Star Race, for when there's no second
// device around.
//
// Pure and dependency-free like scoring.js/rewards.js: runBot() takes the same
// question set the real player is racing and fires onProgress/onFinish in the
// exact shape net.js's oppProgress/oppFinish packets already have. mp.js's
// playBot() sets up net.js's session/netState singletons directly (no socket),
// and <Match> drives runBot() off them — so <Match>, <Hud>, and <Countdown>
// can't tell a bot from a real opponent and needed no changes.
//
// Deterministic from the race's seed, like every other generator here, so a
// bot race is reproducible.

import { makeRng } from './rng.js'
import { pointsFor } from './scoring.js'

export const BOT_LEVELS = [
  { id: 'warmup', label: 'Warm-up robot', avatar: '🤖', accuracy: 0.55, thinkMs: [2200, 4200] },
  { id: 'sharp', label: 'Sharp robot', avatar: '🤖', accuracy: 0.8, thinkMs: [1400, 2800] },
  { id: 'turbo', label: 'Turbo robot', avatar: '🤖', accuracy: 0.95, thinkMs: [700, 1600] },
]

export function getBotLevel(id) {
  return BOT_LEVELS.find((l) => l.id === id) || BOT_LEVELS[0]
}

// Simulates the bot answering `questions` one at a time with a per-question
// think-time drawn from `level.thinkMs`, right or wrong drawn from
// `level.accuracy`, scored with the same scoring.js the player uses so ⭐
// score is directly comparable. Calls `onProgress({ q, score })` after every
// answer and `onFinish({ correct, score, timeMs })` once at the end.
//
// Returns a cancel function — call it if the player leaves mid-race so the
// pending timer doesn't fire into a screen that's moved on.
export function runBot({ seed, skillId, level, questions, onProgress, onFinish }) {
  const rng = makeRng(`${seed}:${skillId}:bot:${level.id}`)
  const total = questions.length
  const startedAt = Date.now()
  let cancelled = false
  let timer = null
  let score = 0
  let correct = 0
  let streak = 0

  function step(i) {
    if (cancelled) return
    if (i >= total) {
      onFinish({ correct, score, timeMs: Date.now() - startedAt })
      return
    }
    const [min, max] = level.thinkMs
    const thinkMs = min + Math.floor(rng.next() * (max - min))
    timer = setTimeout(() => {
      if (cancelled) return
      const ok = rng.next() < level.accuracy
      streak = ok ? streak + 1 : 0
      score += pointsFor({ correct: ok, timeMs: thinkMs, streakAfter: streak })
      correct += ok ? 1 : 0
      onProgress({ q: i + 1, score })
      step(i + 1)
    }, thinkMs)
  }

  step(0)
  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }
}
