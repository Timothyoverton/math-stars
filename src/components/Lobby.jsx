import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import * as net from '../game/net.js'
import { leaveRace } from '../game/mp.js'
import { getSkill } from '../game/skills.js'
import { PARTYKIT_CONFIGURED } from '../game/net-config.js'

export default function Lobby() {
  const [roster, setRoster] = useState(net.session.roster)
  const [connected, setConnected] = useState(net.netState.connected)
  const [ready, setReady] = useState(false)
  const [starting, setStarting] = useState(false)
  const [oppLeft, setOppLeft] = useState(false)
  const [qr, setQr] = useState(null)
  const [copied, setCopied] = useState(false)
  const [skillId, setSkillId] = useState(net.session.skillId)

  const code = net.session.roomCode
  const url = code ? net.joinUrl(code) : ''

  useEffect(() => {
    const offs = [
      net.on('open', () => setConnected(true)),
      net.on('close', () => setConnected(false)),
      net.on('joined', () => setSkillId(net.session.skillId)),
      net.on('roster', (r) => {
        setRoster([...r])
        setOppLeft(false)
        const me = r.find((p) => p.id === net.session.selfId)
        if (me) setReady(me.ready)
      }),
      net.on('start', () => setStarting(true)),
      net.on('oppLeft', () => {
        setOppLeft(true)
        setStarting(false)
        setReady(false)
      }),
      net.on('rematch', () => {
        setStarting(false)
        setReady(false)
      }),
    ]
    return () => offs.forEach((f) => f())
  }, [])

  useEffect(() => {
    if (!url) return
    QRCode.toDataURL(url, { width: 200, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null))
  }, [url])

  function toggleReady() {
    const next = !ready
    setReady(next)
    net.sendReady(next)
  }

  function copyLink() {
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => {},
    )
  }

  const me = roster.find((p) => p.id === net.session.selfId)
  const them = roster.find((p) => p.id !== net.session.selfId)
  const bothHere = roster.length === 2
  const skill = getSkill(skillId)

  return (
    <div className="panel">
      <h1>🏁 Star Race</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {skill ? skill.label : 'Loading skill…'} · 20 questions · first to finish with the most
        right wins
      </p>

      {!PARTYKIT_CONFIGURED && (
        <div className="warn">Multiplayer server isn’t configured for production yet.</div>
      )}

      <label>Join code</label>
      <div className="code">{code}</div>
      <button className="btn secondary" onClick={copyLink}>
        {copied ? 'Copied ✓' : 'Copy invite link'}
      </button>
      {qr && <img className="qr" src={qr} width={180} height={180} alt="Scan to join" />}
      <p className="muted center">Same computer? Open the link in a second tab.</p>

      <div className="roster">
        <PlayerRow player={me} fallback="You" self />
        {them ? (
          <PlayerRow player={them} fallback="Friend" />
        ) : (
          <div className="player">
            <span className="dot" />
            <span>{oppLeft ? 'Friend left — waiting…' : 'Waiting for a friend to join…'}</span>
          </div>
        )}
      </div>

      {!connected && <p className="muted center">Connecting…</p>}
      {connected && starting && <p className="center" style={{ fontWeight: 800 }}>Both ready — starting!</p>}

      <div className="stack">
        <button className="btn big" disabled={!connected || !bothHere || starting} onClick={toggleReady}>
          {ready ? '✓ Ready — waiting for friend' : bothHere ? "I'm ready" : 'Waiting for friend…'}
        </button>
        <button className="btn ghost" onClick={leaveRace}>
          Leave
        </button>
      </div>
    </div>
  )
}

function PlayerRow({ player, fallback, self }) {
  if (!player) {
    return (
      <div className="player">
        <span className="dot" />
        <span>{fallback}…</span>
      </div>
    )
  }
  return (
    <div className={'player' + (player.ready ? ' ready' : '')}>
      <span className="dot" />
      <span className="big">{player.avatar}</span>
      <span>
        {player.name}
        {self ? ' (you)' : ''}
      </span>
      <span style={{ marginLeft: 'auto', color: player.ready ? 'var(--good)' : 'var(--ink-soft)' }}>
        {player.ready ? 'Ready' : 'Not ready'}
      </span>
    </div>
  )
}
