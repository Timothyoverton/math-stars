import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isCorrect } from './questions.js'
import { pointsFor, starsForAccuracy } from './scoring.js'
import { beginActivity, updateActivity, endActivity } from './session.js'
import { playCorrect, playWrong } from './celebrate.js'

// How long the "Correct! / Answer: …" flash holds the just-answered question
// on screen (Question.jsx already locks it against a second submit) before
// advancing — long enough to read and hear, short enough not to drag over 20
// questions.
const ANSWER_FLASH_MS = 900

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
  const bestStreakRef = useRef(0)
  const [lastAnswer, setLastAnswer] = useState(null) // { correct, value, points } | null
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState(null)

  const startedRef = useRef(false)
  const questionShownAt = useRef(performance.now())
  const runStartedAt = useRef(performance.now())
  const advanceTimerRef = useRef(null)
  const pendingAdvanceRef = useRef(null) // set while the flash is showing; skipFlash() runs it early

  if (!startedRef.current) {
    startedRef.current = true
    beginActivity({ mode, skillId, seed, questions })
    runStartedAt.current = performance.now()
    questionShownAt.current = performance.now()
  }

  useEffect(() => () => clearTimeout(advanceTimerRef.current), [])

  const total = questions.length
  const question = questions[index] || null

  const answer = useCallback(
    (value) => {
      // lastAnswer doubles as "already answered, waiting on the flash" — the
      // question on screen is frozen (and Question.jsx's own lock blocks a
      // second submit) until the timer below advances.
      if (finished || index >= total || lastAnswer) return
      const q = questions[index]
      const now = performance.now()
      const timeMs = now - questionShownAt.current
      const ok = isCorrect(value, q.answer)
      const nextStreak = ok ? streak + 1 : 0
      if (nextStreak > bestStreakRef.current) bestStreakRef.current = nextStreak
      const gained = pointsFor({ correct: ok, timeMs, streakAfter: nextStreak })

      const nextScore = score + gained
      const nextCorrect = correct + (ok ? 1 : 0)
      const nextIndex = index + 1

      setStreak(nextStreak)
      setScore(nextScore)
      setCorrect(nextCorrect)
      setLastAnswer({ correct: ok, value: String(value), points: gained, expected: q.answer })
      if (ok) playCorrect()
      else playWrong()

      // Score/streak update the session mirror (and the opponent's live HUD)
      // right away — harmless, nothing gates on them. `index`/`currentQuestion`
      // stay put until doAdvance below: session.activity.currentQuestion is
      // what the Playwright specs (and a fast real answer) read to know what
      // to answer next, and it must not name a question the DOM — still
      // locked on the frozen, just-answered one — hasn't shown yet.
      updateActivity({ score: nextScore, streak: nextStreak, correct: nextCorrect })
      onProgress?.({ q: nextIndex, score: nextScore })

      const justFinished = nextIndex >= total
      let r = null
      if (justFinished) {
        const timeMsTotal = Math.round(now - runStartedAt.current)
        const accuracy = nextCorrect / total
        r = {
          mode: mode === 'race' ? 'race' : 'solo',
          skillId,
          seed,
          total,
          correct: nextCorrect,
          accuracy,
          score: nextScore,
          timeMs: timeMsTotal,
          stars: starsForAccuracy(accuracy),
          bestStreak: bestStreakRef.current,
        }
      }

      const doAdvance = () => {
        pendingAdvanceRef.current = null
        setIndex(nextIndex)
        setLastAnswer(null)
        questionShownAt.current = performance.now()
        updateActivity({ index: nextIndex })
        if (justFinished) {
          endActivity()
          setFinished(true)
          setResult(r)
          onFinish?.(r)
        }
      }
      pendingAdvanceRef.current = doAdvance
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = setTimeout(doAdvance, ANSWER_FLASH_MS)
    },
    [
      finished,
      index,
      total,
      questions,
      streak,
      score,
      correct,
      mode,
      seed,
      skillId,
      onProgress,
      onFinish,
      lastAnswer,
    ],
  )

  const progressPct = useMemo(() => Math.round((index / total) * 100), [index, total])

  // Lets a keyboard/tap handler cut the flash short and jump straight to the
  // next question instead of waiting out ANSWER_FLASH_MS — a no-op once the
  // timer has already fired (or there's nothing pending to skip).
  const skipFlash = useCallback(() => {
    if (!pendingAdvanceRef.current) return
    clearTimeout(advanceTimerRef.current)
    pendingAdvanceRef.current()
  }, [])

  return {
    index,
    total,
    score,
    streak,
    correct,
    question,
    answer,
    lastAnswer,
    skipFlash,
    finished,
    result,
    progressPct,
  }
}

// Companion hook for <Practice>/<Warmup>/<Match>: while the flash is showing,
// Enter jumps straight to the next question instead of waiting out
// ANSWER_FLASH_MS. Kept separate from useQuiz so it doesn't have to coordinate
// with Question.jsx's own numpad Enter handler (submit — a no-op once
// answered) — both just listen independently.
export function useSkipFlashOnEnter({ lastAnswer, skipFlash }) {
  useEffect(() => {
    if (!lastAnswer) return
    function onKeyDown(e) {
      if (e.key === 'Enter') skipFlash()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lastAnswer, skipFlash])
}
