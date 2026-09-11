import { useEffect, useState } from 'react'
import { netState, session } from '../game/net.js'

// Samples the opponent singleton on a timer — packets arrive several times a
// set and must not re-render the quiz on arrival.
export default function Hud({ selfQ, selfScore, total }) {
  const [, force] = useState(0)

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 300)
    return () => clearInterval(id)
  }, [])

  const opp = session.roster.find((p) => p.id !== session.selfId)
  const oppQ = netState.oppFinish ? total : netState.oppProgress?.q ?? 0
  const oppScore = netState.oppFinish?.score ?? netState.oppProgress?.score ?? 0

  return (
    <div className="hud">
      <span className="who">
        You · Q{Math.min(selfQ + 1, total)}/{total} · ⭐{selfScore}
      </span>
      <span className="who">
        {opp?.avatar || '👤'} {opp?.name || 'Friend'} · Q{Math.min(oppQ, total)}/{total} · ⭐
        {oppScore}
        {netState.oppFinish ? ' 🏁' : ''}
      </span>
    </div>
  )
}
