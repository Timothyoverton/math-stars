import { useEffect, useState } from 'react'
import Menu from './components/Menu.jsx'
import Warmup from './components/Warmup.jsx'
import Practice from './components/Practice.jsx'
import Lobby from './components/Lobby.jsx'
import Countdown from './components/Countdown.jsx'
import Match from './components/Match.jsx'
import Result from './components/Result.jsx'
import Progress from './components/Progress.jsx'
import Collection from './components/Collection.jsx'
import ExploreMap from './components/ExploreMap.jsx'
import ExploreStop from './components/ExploreStop.jsx'
import { usePhase, useRunId } from './game/store.js'
import { Store } from './game/persist/index.js'
import { session } from './game/session.js'
import { bootstrapMultiplayer, useMultiplayerCoordinator } from './game/mp.js'

// pick up a ?join=CODE link before React settles, so we land in the lobby
bootstrapMultiplayer()

export default function App() {
  const phase = usePhase()
  const runId = useRunId()
  const [overlay, setOverlay] = useState(null) // null | 'progress' | 'collection'
  useMultiplayerCoordinator()

  useEffect(() => {
    Store.getProfile().then((p) => {
      session.profile = p
    })
  }, [])

  return (
    <div className="screen">
      <div className="brandbar">
        <span className="star">⭐</span> MATH STARS
      </div>

      {overlay === 'progress' ? (
        <Progress onBack={() => setOverlay(null)} />
      ) : overlay === 'collection' ? (
        <Collection onBack={() => setOverlay(null)} />
      ) : (
        <>
          {phase === 'menu' && (
            <Menu
              onOpenProgress={() => setOverlay('progress')}
              onOpenCollection={() => setOverlay('collection')}
            />
          )}
          {phase === 'warmup' && <Warmup key={runId} />}
          {phase === 'practice' && <Practice key={runId} />}
          {phase === 'lobby' && <Lobby />}
          {phase === 'countdown' && <Countdown key={runId} />}
          {phase === 'match' && <Match key={runId} />}
          {phase === 'result' && <Result />}
          {phase === 'explore' && <ExploreMap />}
          {phase === 'exploreStop' && <ExploreStop key={runId} />}
        </>
      )}
    </div>
  )
}
