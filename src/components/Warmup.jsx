import { useEffect, useMemo } from 'react'
import Question from './Question.jsx'
import MathExpr from './MathExpr.jsx'
import { buildQuestionSet, randomSeed } from '../game/questions.js'
import { getSkill } from '../game/skills.js'
import { useQuiz, useSkipFlashOnEnter } from '../game/useQuiz.js'
import { getState, startPractice } from '../game/store.js'

export const WARMUP_COUNT = 5
const HANDOFF_DELAY = 500 // a beat on "Nice — on to the real set…" before the real 20 begin

// 5 unscored questions before the real 20 — <Menu> only routes here for a
// skill with no progress yet. Reuses the same engine as <Practice> (so the
// Playwright dev globals work identically); it just never calls
// Store.recordActivity, and hands off to the real set instead of a result.
export default function Warmup() {
  const skillId = getState().skillId
  const skill = getSkill(skillId)
  const seed = useMemo(() => randomSeed(), [])
  const questions = useMemo(
    () => buildQuestionSet(seed, skillId, WARMUP_COUNT),
    [seed, skillId],
  )

  const quiz = useQuiz({ questions, mode: 'solo', seed, skillId })
  useSkipFlashOnEnter(quiz)

  // Deliberately not in useQuiz's own onFinish: that fires synchronously
  // inside the last answer's click handler, and calling startPractice()
  // (a store transition that unmounts this component) right there raced the
  // session.activity mirror an in-flight answerCurrent() was still polling —
  // caught by tests/polish.spec.js. A beat on setTimeout, like Countdown's
  // own GO! -> beginMatch pause, gives everything a moment to settle first.
  useEffect(() => {
    if (!quiz.finished) return
    const t = setTimeout(() => startPractice(skillId), HANDOFF_DELAY)
    return () => clearTimeout(t)
  }, [quiz.finished, skillId])

  if (quiz.finished) {
    return (
      <div className="panel center">
        <p>Nice — on to the real set…</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="center" style={{ marginBottom: 4 }}>
        <span className="pill">
          Get ready — warm-up {quiz.index + 1}/{WARMUP_COUNT}
        </span>
      </div>
      <p className="muted center" style={{ marginTop: 0 }}>
        {skill?.label} · doesn’t count toward your score
      </p>

      <div
        className={
          'feedback ' + (quiz.lastAnswer ? (quiz.lastAnswer.correct ? 'good' : 'bad') : '')
        }
        role="status"
        aria-live="polite"
      >
        {quiz.lastAnswer ? (
          quiz.lastAnswer.correct ? (
            <>
              Correct! · <MathExpr text={String(quiz.lastAnswer.expected)} />
            </>
          ) : (
            <>
              Answer: <MathExpr text={String(quiz.lastAnswer.expected)} />
            </>
          )
        ) : (
          ' '
        )}
      </div>

      <Question question={quiz.question} onAnswer={quiz.answer} />

      <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => startPractice(skillId)}>
        Skip warm-up
      </button>
    </div>
  )
}
