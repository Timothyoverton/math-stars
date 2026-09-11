import { useCallback, useEffect, useState } from 'react'
import { EXPLORE_MAPS, mapNodes, nodeKey } from '../game/explore.js'
import { Store } from '../game/persist/index.js'
import { startExploreNode, toMenu, useExploreJustCompleted } from '../game/store.js'
import { session } from '../game/session.js'

// The path view for the current map: one node per stop plus a trailing Map
// Check, gated sequentially by the stored frontier. Always shows the map the
// frontier is on — browsing back to an earlier, already-finished map isn't
// in scope for v1 (see docs/EXPLORE_MODE.md).
export default function ExploreMap() {
  const [explore, setExplore] = useState(null) // { frontier, results } | null while loading
  const justCompleted = useExploreJustCompleted()

  const refresh = useCallback(() => {
    Store.getExplore().then(setExplore)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, justCompleted])

  if (!explore) {
    return (
      <div className="panel center">
        <p>Loading the map…</p>
      </div>
    )
  }

  const { frontier, results } = explore
  const mapIndex = frontier.mapIndex
  const map = EXPLORE_MAPS[mapIndex]
  const nodes = mapNodes(map)
  const isLastMap = mapIndex === EXPLORE_MAPS.length - 1
  const frontierNode = nodes[frontier.nodeIndex]
  const frontierResult = results[nodeKey(map, frontierNode)]
  const allMapsDone =
    isLastMap && frontierNode.type === 'check' && frontierResult && frontierResult.passed

  return (
    <div className="panel">
      <div className="quiz-top">
        <span className="pill">
          🗺️ Map {mapIndex + 1} / {EXPLORE_MAPS.length} · Grade {map.grade}
        </span>
        <button className="btn ghost" onClick={toMenu}>
          Menu
        </button>
      </div>

      {justCompleted && (
        <div className="feedback good" role="status" aria-live="polite">
          {justCompleted.label} complete — {justCompleted.stars}⭐
          {justCompleted.passed === false ? ' · try the check again anytime' : ''}
          {justCompleted.gem ? ` · found a ${justCompleted.gem.name}!` : ''}
        </div>
      )}

      {allMapsDone && (
        <p className="muted center">You've explored every map — nice digging! 🏆</p>
      )}

      <div className="explore-path">
        {nodes.map((node, i) => {
          const k = nodeKey(map, node)
          const result = results[k]
          const done = i < frontier.nodeIndex || (i === frontier.nodeIndex && allMapsDone)
          const locked = i > frontier.nodeIndex
          const isFrontier = i === frontier.nodeIndex && !allMapsDone
          const label = node.type === 'check' ? 'Map Check' : node.skill.label
          const icon = locked ? '🔒' : node.type === 'check' ? '💎' : '⛏️'

          return (
            <button
              key={k}
              className={
                'explore-node' +
                (done ? ' done' : '') +
                (isFrontier ? ' current' : '') +
                (locked ? ' locked' : '')
              }
              disabled={locked}
              onClick={() => startExploreNode(mapIndex, i)}
            >
              <span className="explore-node-icon">
                {isFrontier ? session.profile?.avatar || '🧑' : icon}
              </span>
              <span className="explore-node-label">{label}</span>
              {done && <span className="explore-node-check">✓</span>}
              {result && !done && (
                <span className="explore-node-score">
                  {result.correct}/{result.total}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
