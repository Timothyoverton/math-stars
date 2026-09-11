import { useCallback, useMemo, useRef, useState } from 'react'
import { isCorrect } from './questions.js'
import { pointsFor, starsForAccuracy } from './scoring.js'
import { beginActivity, updateActivity, endActivity } from './session.js'

// The shared "run a 20-question set" engine, used by both <Practice> (solo) and
// <Match> (Star Race). Owns the per-answer state as ordinary React state and
// mirrors a snapshot into session.js so non-React code and the Playwright specs
// can read `window.__session.activity.currentQuestion.answer`.
//
//   questions  — from buildQuestionSet()
//   mode       — 'solo' | 'race'
//   onProgress({ q, score })     — after every answer (throttled by the caller)
//   onFinish(result)             — once, when the last question is answered
export function useQuiz({ questions, mode, seed, skillId, onProgress, onFinish }) {
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [lastAnswer, setLastAnswer] = useState(null) // { correct, value, points } | null
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState(null)

  const startedRef = useRef(false)
  const questionShownAt = useRef(performance.now())
  const runStartedAt = useRef(performance.now())

  if (!startedRef.current) {
    startedRef.current = true
    beginActivity({ mode, skillId, seed, questions })
    runStartedAt.current = performance.now()
    questionShownAt.current = performance.now()
  }

  const total = questions.length
  const question = questions[index] || null

  const answer = useCallback(
    (value) => {
      if (finished || index >= total) return
      const q = questions[index]
      const now = performance.now()
      const timeMs = now - questionShownAt.current
      const ok = isCorrect(value, q.answer)
      const nextStreak = ok ? streak + 1 : 0
      const gained = pointsFor({ correct: ok, timeMs, streakAfter: nextStreak })

      const nextScore = score + gained
      const nextCorrect = correct + (ok ? 1 : 0)
      const nextIndex = index + 1

      setStreak(nextStreak)
      setScore(nextScore)
      setCorrect(nextCorrect)
      setIndex(nextIndex)
      setLastAnswer({ correct: ok, value: String(value), points: gained, expected: q.answer })
      questionShownAt.current = performance.now()

      updateActivity({
        index: nextIndex,
        score: nextScore,
        streak: nextStreak,
        correct: nextCorrect,
      })
      onProgress?.({ q: nextIndex, score: nextScore })

      if (nextIndex >= total) {
        const timeMsTotal = Math.round(now - runStartedAt.current)
        const accuracy = nextCorrect / total
        const r = {
          mode: mode === 'race' ? 'race' : 'solo',
          skillId,
          seed,
          total,
          correct: nextCorrect,
          accuracy,
          score: nextScore,
          timeMs: timeMsTotal,
          stars: starsForAccuracy(accuracy),
        }
        setFinished(true)
        setResult(r)
        endActivity()
        onFinish?.(r)
      }
    },
    [finished, index, total, questions, streak, score, correct, mode, seed, skillId, onProgress, onFinish],
  )

  const progressPct = useMemo(() => Math.round((index / total) * 100), [index, total])

  return {
    index,
    total,
    score,
    streak,
    correct,
    question,
    answer,
    lastAnswer,
    finished,
    result,
    progressPct,
  }
}
