import { useResult, startPractice, toMenu } from '../game/store.js'
import * as net from '../game/net.js'
import { leaveRace } from '../game/mp.js'

function fmtTime(ms) {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m ? `${m}m ${s % 60}s` : `${s}s`
}

function Stars({ n }) {
  return (
    <div className="result-stars">
      {'★'.repeat(n)}
      <span style={{ color: 'var(--line)' }}>{'★'.repeat(3 - n)}</span>
    </div>
  )
}

export default function Result() {
  const result = useResult()
  if (!result) return null

  return result.mode === 'race' ? <RaceResult r={result} /> : <SoloResult r={result} />
}

function SoloResult({ r }) {
  const acc = Math.round(r.accuracy * 100)
  return (
    <div className="panel center">
      <h1>{r.correct === r.total ? 'Perfect set! 🎉' : 'Set complete!'}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {r.skillLabel}
      </p>

      <Stars n={r.stars} />
      {r.newBest && <span className="badge-best">★ New best score</span>}

      <div className="stat-grid">
        <div className="stat">
          <b>{r.score}</b>
          <span>SCORE</span>
        </div>
        <div className="stat">
          <b>
            {r.correct}/{r.total}
          </b>
          <span>CORRECT</span>
        </div>
        <div className="stat">
          <b>{acc}%</b>
          <span>ACCURACY</span>
        </div>
        <div className="stat">
          <b>{fmtTime(r.timeMs)}</b>
          <span>TIME</span>
        </div>
      </div>

      <p className="muted">Mastery on this skill: {Math.round((r.mastery || 0) * 100)}%</p>

      <div className="stack">
        <button className="btn big" onClick={() => startPractice(r.skillId)}>
          Practise again
        </button>
        <button className="btn ghost" onClick={toMenu}>
          Back to menu
        </button>
      </div>
    </div>
  )
}

function RaceResult({ r }) {
  const headline =
    r.outcome === 'win'
      ? 'You win! 🏆'
      : r.outcome === 'lose'
        ? 'Your friend wins 🎖️'
        : r.outcome === 'draw'
          ? "It's a draw! 🤝"
          : 'Your friend left — you take it 🏆'

  return (
    <div className="panel center">
      <h1>{headline}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {r.skillLabel} · Star Race
      </p>

      <div className="stat-grid">
        <div className="stat">
          <b>
            {r.self.correct}/{r.self.total}
          </b>
          <span>YOU — CORRECT</span>
        </div>
        <div className="stat">
          <b>⭐ {r.self.score}</b>
          <span>YOU — SCORE</span>
        </div>
        <div className="stat">
          <b>{r.opp ? `${r.opp.correct}/${r.self.total}` : '—'}</b>
          <span>FRIEND — CORRECT</span>
        </div>
        <div className="stat">
          <b>{r.opp ? `⭐ ${r.opp.score}` : '—'}</b>
          <span>FRIEND — SCORE</span>
        </div>
      </div>
      <p className="muted">Winner is whoever got more right — faster time breaks a tie.</p>

      <div className="stack">
        {net.netState.connected && r.opp ? (
          <button className="btn big" onClick={() => net.sendRematch()}>
            Rematch
          </button>
        ) : null}
        <button className="btn ghost" onClick={leaveRace}>
          Back to menu
        </button>
      </div>
    </div>
  )
}
