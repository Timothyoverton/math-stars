import { useCallback, useMemo, useRef } from 'react'
import Question from './Question.jsx'
import MathExpr from './MathExpr.jsx'
import { buildQuestionSet, randomSeed } from '../game/questions.js'
import { getSkill } from '../game/skills.js'
import { useQuiz } from '../game/useQuiz.js'
import { Store } from '../game/persist/index.js'
import { getState, finishActivity, toMenu } from '../game/store.js'

export default function Practice() {
  const skillId = getState().skillId
  const skill = getSkill(skillId)
  const seed = useMemo(() => randomSeed(), [])
  const questions = useMemo(() => buildQuestionSet(seed, skillId), [seed, skillId])
  const savedRef = useRef(false)

  const onFinish = useCallback(
    async (r) => {
      if (savedRef.current) return
      savedRef.current = true
      const rolled = await Store.recordActivity({
        skillId: r.skillId,
        total: r.total,
        correct: r.correct,
        score: r.score,
        timeMs: r.timeMs,
        mode: 'solo',
      })
      finishActivity({
        ...r,
        stars: rolled.setStars,
        newBest: rolled.newBest,
        best: rolled.progress.best,
        mastery: rolled.progress.mastery,
        skillLabel: skill?.label || r.skillId,
      })
    },
    [skill],
  )

  const quiz = useQuiz({ questions, mode: 'solo', seed, skillId, onFinish })

  if (quiz.finished) {
    return (
      <div className="panel center">
        <p>Marking your answers…</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="quiz-top">
        <span className="pill">
          Q{quiz.index + 1} / {quiz.total}
        </span>
        <span className="pill">
          ⭐ {quiz.score}
          {quiz.streak >= 2 ? `  ·  🔥 ${quiz.streak}` : ''}
        </span>
      </div>
      <div className="bar">
        <span style={{ width: `${(quiz.index / quiz.total) * 100}%` }} />
      </div>

      <p className="muted center" style={{ marginTop: 0 }}>
        {skill?.label}
      </p>

      <div
        className={
          'feedback ' + (quiz.lastAnswer ? (quiz.lastAnswer.correct ? 'good' : 'bad') : '')
        }
      >
        {quiz.lastAnswer ? (
          quiz.lastAnswer.correct ? (
            `Correct! +${quiz.lastAnswer.points}`
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

      <button className="btn ghost" style={{ marginTop: 14 }} onClick={toMenu}>
        Quit
      </button>
    </div>
  )
}
