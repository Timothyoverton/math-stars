import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Question from './Question.jsx'
import MathExpr from './MathExpr.jsx'
import Hud from './Hud.jsx'
import { buildQuestionSet } from '../game/questions.js'
import { getSkill } from '../game/skills.js'
import { useQuiz } from '../game/useQuiz.js'
import * as net from '../game/net.js'
import { runBot } from '../game/bot.js'
import { Store } from '../game/persist/index.js'
import { finishMatch } from '../game/store.js'
import { leaveRace } from '../game/mp.js'
import { gemFor } from '../game/rewards.js'
import { getGem } from '../game/gems.js'

function decideOutcome(self, opp) {
  if (!opp) return 'forfeit'
  if (self.correct !== opp.correct) return self.correct > opp.correct ? 'win' : 'lose'
  if (self.timeMs !== opp.timeMs) return self.timeMs < opp.timeMs ? 'win' : 'lose'
  return 'draw'
}

export default function Match() {
  const skillId = net.session.skillId
  const seed = net.session.seed
  const skill = getSkill(skillId)
  const questions = useMemo(() => buildQuestionSet(seed, skillId), [seed, skillId])

  const selfResultRef = useRef(null)
  const oppResultRef = useRef(undefined) // undefined = still racing, null = left, {} = finished
  const settledRef = useRef(false)

  const [waiting, setWaiting] = useState(false)

  const settle = useCallback(async () => {
    if (settledRef.current) return
    const self = selfResultRef.current
    if (!self) return
    const opp = oppResultRef.current
    if (opp === undefined) return // opponent still going
    settledRef.current = true

    const rolled = await Store.recordActivity({
      skillId,
      total: self.total,
      correct: self.correct,
      score: self.score,
      timeMs: self.timeMs,
      mode: 'race',
    })

    const outcome = decideOutcome(self, opp)
    const gemId = gemFor({
      stars: rolled.setStars,
      perfect: self.correct === self.total,
      firstFullMastery: rolled.prevStars < 3 && rolled.progress.stars === 3,
      raceWin: outcome === 'win' || outcome === 'forfeit',
      tenStreak: self.bestStreak >= 10,
      newBest: rolled.newBest,
    })
    const gem = gemId ? { ...getGem(gemId), ...(await Store.awardGem(gemId)) } : null

    finishMatch({
      mode: 'race',
      skillId,
      skillLabel: skill?.label || skillId,
      self,
      opp: opp || null,
      outcome,
      gem,
      isBot: !!net.session.botLevel,
      botLevelId: net.session.botLevel?.id,
    })
  }, [skillId, skill])

  const onProgress = useCallback((p) => net.sendProgress(p), [])

  const onFinish = useCallback(
    (r) => {
      selfResultRef.current = r
      net.sendFinish({ correct: r.correct, score: r.score, timeMs: r.timeMs })
      setWaiting(true)
      settle()
    },
    [settle],
  )

  useEffect(() => {
    // opponent may already have finished before us
    if (net.netState.oppFinish) oppResultRef.current = net.netState.oppFinish

    const offs = [
      net.on('oppFinish', (f) => {
        oppResultRef.current = f
        settle()
      }),
      net.on('oppLeft', () => {
        oppResultRef.current = null
        settle()
      }),
    ]
    return () => offs.forEach((f) => f())
  }, [settle])

  // Racing the robot: drive the bot through the same question set, feeding its
  // answers into the same oppProgress/oppFinish shape a real opponent's
  // packets would — see bot.js.
  useEffect(() => {
    const level = net.session.botLevel
    if (!level) return
    return runBot({
      seed,
      skillId,
      level,
      questions,
      onProgress: (p) => {
        net.netState.oppProgress = p
      },
      onFinish: (f) => {
        net.netState.oppFinish = f
        net.emit('oppFinish', f)
      },
    })
  }, [seed, skillId, questions])

  const quiz = useQuiz({ questions, mode: 'race', seed, skillId, onProgress, onFinish })

  if (waiting || quiz.finished) {
    return (
      <div className="panel center">
        <h2>Finished! 🏁</h2>
        <p>Waiting for your friend to finish…</p>
        <p className="muted">
          You got {selfResultRef.current?.correct}/{questions.length} · ⭐{' '}
          {selfResultRef.current?.score}
        </p>
        <button className="btn ghost" onClick={leaveRace}>
          Leave
        </button>
      </div>
    )
  }

  return (
    <div className="panel">
      <Hud selfQ={quiz.index} selfScore={quiz.score} total={quiz.total} />

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

      <button className="btn ghost" style={{ marginTop: 14 }} onClick={leaveRace}>
        Quit race
      </button>
    </div>
  )
}
