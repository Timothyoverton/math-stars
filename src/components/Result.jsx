import { useEffect, useRef, useState } from 'react'
import { useResult, startPractice, toMenu } from '../game/store.js'
import * as net from '../game/net.js'
import { session as profileSession } from '../game/session.js'
import { leaveRace, playBot } from '../game/mp.js'
import { TIER_LABEL } from '../game/gems.js'
import { playChime } from '../game/celebrate.js'
import { renderShareCard } from '../game/shareCard.js'

function fmtTime(ms) {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m ? `${m}m ${s % 60}s` : `${s}s`
}

function Stars({ n, celebrate }) {
  return (
    <div className={'result-stars' + (celebrate ? ' celebrate-pop' : '')}>
      {'★'.repeat(n)}
      <span style={{ color: 'var(--line)' }}>{'★'.repeat(3 - n)}</span>
    </div>
  )
}

function GemDrop({ gem }) {
  if (!gem) return null
  return (
    <div className="gem-drop">
      <span
        className="gem-stone"
        style={{ '--g1': gem.colors[0], '--g2': gem.colors[1] }}
        role="img"
        aria-label={gem.name}
      />
      <div>
        <b>
          {gem.name} {gem.isNew && <span className="gem-new">New!</span>}
        </b>
        <span className="muted">
          {TIER_LABEL[gem.tier]} gem · you have {gem.count}
        </span>
      </div>
    </div>
  )
}

// A 3-star set, a new best, or a race win earns a bigger celebration — a
// synthesized chime plus a bit of extra motion on the headline/stars (see
// index.css's .celebrate-pop, which no-ops under prefers-reduced-motion).
function isBigWin(result) {
  if (!result) return false
  return result.mode === 'race' ? result.outcome === 'win' : result.stars === 3 || result.newBest
}

export default function Result() {
  const result = useResult()
  const celebratedRef = useRef(null)

  useEffect(() => {
    if (result && result !== celebratedRef.current && isBigWin(result)) {
      celebratedRef.current = result
      playChime()
    }
  }, [result])

  if (!result) return null

  return result.mode === 'race' ? <RaceResult r={result} /> : <SoloResult r={result} />
}

function SoloResult({ r }) {
  const acc = Math.round(r.accuracy * 100)
  const celebrate = isBigWin(r)
  return (
    <div className="panel center">
      <h1 className={celebrate ? 'celebrate-pop' : ''}>
        {r.correct === r.total ? 'Perfect set! 🎉' : 'Set complete!'}
      </h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {r.skillLabel}
      </p>

      <Stars n={r.stars} celebrate={celebrate} />
      {r.newBest && <span className="badge-best">★ New best score</span>}
      <GemDrop gem={r.gem} />

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

function opponentName(r) {
  if (r.isBot) return net.session.botLevel?.label || 'the robot'
  return net.session.roster.find((p) => p.id !== net.session.selfId)?.name || 'your friend'
}

function ShareCard({ r }) {
  const [url, setUrl] = useState(null)

  function build() {
    setUrl(
      renderShareCard({
        skillLabel: r.skillLabel,
        youName: profileSession.profile?.name || 'You',
        youAvatar: profileSession.profile?.avatar || '🦊',
        youCorrect: r.self.correct,
        total: r.self.total,
        youScore: r.self.score,
        oppName: opponentName(r),
        oppCorrect: r.opp?.correct ?? 0,
        oppScore: r.opp?.score ?? 0,
      }),
    )
  }

  if (!url) {
    return (
      <button className="btn secondary" onClick={build}>
        🖼️ Make a share card
      </button>
    )
  }
  return (
    <div className="share-card">
      <img src={url} alt={`${r.skillLabel} Star Race win`} />
      <a className="btn secondary" href={url} download="math-stars-win.png">
        Save image
      </a>
    </div>
  )
}

function RaceResult({ r }) {
  const oppLabel = r.isBot ? 'the robot' : 'your friend'
  const oppCol = r.isBot ? 'ROBOT' : 'FRIEND'
  const win = r.outcome === 'win'
  const headline = win
    ? 'You win! 🏆'
    : r.outcome === 'lose'
      ? `${r.isBot ? 'The robot wins' : 'Your friend wins'} 🎖️`
      : r.outcome === 'draw'
        ? "It's a draw! 🤝"
        : `${r.isBot ? 'The robot left' : 'Your friend left'} — you take it 🏆`

  return (
    <div className="panel center">
      <h1 className={win ? 'celebrate-pop' : ''}>{headline}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {r.skillLabel} · Star Race{r.isBot ? ` vs ${oppLabel}` : ''}
      </p>
      <GemDrop gem={r.gem} />

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
          <span>{oppCol} — CORRECT</span>
        </div>
        <div className="stat">
          <b>{r.opp ? `⭐ ${r.opp.score}` : '—'}</b>
          <span>{oppCol} — SCORE</span>
        </div>
      </div>
      <p className="muted">Winner is whoever got more right — faster time breaks a tie.</p>

      {win && <ShareCard r={r} />}

      <div className="stack">
        {r.isBot ? (
          <button className="btn big" onClick={() => playBot(r.skillId, r.botLevelId)}>
            Race the robot again
          </button>
        ) : net.netState.connected && r.opp ? (
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
