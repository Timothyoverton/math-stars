import { useCallback, useMemo, useRef } from 'react'
import Question from './Question.jsx'
import MathExpr from './MathExpr.jsx'
import { randomSeed } from '../game/questions.js'
import {
  EXPLORE_MAPS,
  mapNodes,
  nodeKey,
  reviewPool,
  buildStopQuestionSet,
  buildCheckQuestionSet,
  CHECK_PASS_FRACTION,
} from '../game/explore.js'
import { useQuiz, useSkipFlashOnEnter } from '../game/useQuiz.js'
import { Store } from '../game/persist/index.js'
import { getState, finishExploreNode } from '../game/store.js'
import { starsForAccuracy } from '../game/scoring.js'
import { gemFor } from '../game/rewards.js'
import { getGem } from '../game/gems.js'

// One Explore Mode node — a stop (one skill, 80/20 mix) or a Map Check
// (mixed across the whole map). Wraps useQuiz exactly like <Practice>, but
// on finish it updates explore progress (+ recordActivity for a stop, never
// for a check — see docs/EXPLORE_MODE.md) and returns straight to the map
// (phase 'explore'), not the generic result screen.
export default function ExploreStop() {
  const mapIndex = getState().exploreMapIndex
  const nodeIndex = getState().exploreNodeIndex
  const map = EXPLORE_MAPS[mapIndex]
  const nodes = useMemo(() => mapNodes(map), [map])
  const node = nodes[nodeIndex]
  const key = nodeKey(map, node)

  const seed = useMemo(() => randomSeed(), [])
  const questions = useMemo(() => {
    if (node.type === 'check') return buildCheckQuestionSet(seed, map)
    return buildStopQuestionSet(seed, node.skill, reviewPool(mapIndex))
  }, [seed, map, node, mapIndex])

  const savedRef = useRef(false)

  const onFinish = useCallback(
    async (r) => {
      if (savedRef.current) return
      savedRef.current = true

      let stars = starsForAccuracy(r.accuracy)
      let firstFullMastery = false
      let passed = true // stops always "pass" — no punishment, just record + move on

      if (node.type === 'stop') {
        const rolled = await Store.recordActivity({
          skillId: node.skill.id,
          total: r.total,
          correct: r.correct,
          score: r.score,
          timeMs: r.timeMs,
          mode: 'explore',
        })
        stars = rolled.setStars
        firstFullMastery = rolled.prevStars < 3 && rolled.progress.stars === 3
      } else {
        passed = r.accuracy >= CHECK_PASS_FRACTION
      }

      const gemId = gemFor({
        stars,
        perfect: r.correct === r.total,
        firstFullMastery,
        raceWin: false,
        tenStreak: r.bestStreak >= 10,
        newBest: false,
      })
      const gem = gemId ? { ...getGem(gemId), ...(await Store.awardGem(gemId)) } : null

      await Store.recordExploreNode(
        mapIndex,
        nodeIndex,
        key,
        { correct: r.correct, total: r.total, score: r.score },
        passed,
      )

      finishExploreNode({
        mapIndex,
        nodeIndex,
        passed,
        gem,
        stars,
        label: node.type === 'check' ? 'Map Check' : node.skill.label,
      })
    },
    [mapIndex, nodeIndex, key, node],
  )

  const quiz = useQuiz({ questions, mode: 'solo', seed, skillId: node.skill?.id, onFinish })
  useSkipFlashOnEnter(quiz)

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
        {node.type === 'check' ? '💎 Map Check · ' : '⛏️ '}
        {node.type === 'check' ? `Grade ${map.grade}` : node.skill.label}
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
              Correct! +{quiz.lastAnswer.points} ·{' '}
              <MathExpr text={String(quiz.lastAnswer.expected)} />
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

      <button
        className="btn ghost"
        style={{ marginTop: 14 }}
        onClick={() => finishExploreNode(null)}
      >
        Back to map
      </button>
    </div>
  )
}
