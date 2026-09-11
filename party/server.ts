// Math Stars — Star Race relay.
//
// Deliberately dumb, exactly like speed-racer's. All scoring is client-side and
// a race result is each player's own locally-computed score. The server never
// sees a question or an answer. Its whole job:
//
//   1. pair two players into a room (the room name IS the join code)
//   2. carry the host's skill choice to the guest
//   3. agree one countdown-zero timestamp and one RNG seed so both clients
//      build the identical 20 questions and start together
//   4. relay progress and finish packets between the two
//
// Max two players per room. First in is the host.

import type * as Party from 'partykit/server'

interface PlayerState {
  id: string
  name: string
  avatar: string
  slot: 1 | 2
  ready: boolean
  finished: null | { correct: number; score: number; timeMs: number }
}

type In =
  | { type: 'hello'; name: string; avatar: string; skillId: string }
  | { type: 'ready'; ready: boolean }
  | { type: 'ping'; t: number }
  | { type: 'progress'; q: number; score: number }
  | { type: 'finish'; correct: number; score: number; timeMs: number }
  | { type: 'rematch' }

interface RosterEntry {
  id: string
  name: string
  avatar: string
  slot: 1 | 2
  ready: boolean
}

type Out =
  | { type: 'joined'; selfId: string; isHost: boolean; skillId: string; roster: RosterEntry[] }
  | { type: 'roster'; roster: RosterEntry[] }
  | { type: 'full' }
  | { type: 'pong'; t: number; s: number }
  | { type: 'start'; startAt: number; seed: string; skillId: string }
  | { type: 'oppProgress'; q: number; score: number }
  | { type: 'oppFinish'; correct: number; score: number; timeMs: number }
  | { type: 'oppLeft' }
  | { type: 'rematch' }

const IDLE_ROOM_MS = 15 * 60 * 1000

export default class RaceServer implements Party.Server {
  players = new Map<string, PlayerState>()
  hostId: string | null = null
  skillId = ''
  started = false
  idleTimer: ReturnType<typeof setTimeout> | null = null

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    this.bumpIdle()
    if (this.players.size >= 2) {
      this.send(conn, { type: 'full' })
      setTimeout(() => conn.close(), 50)
      return
    }
    const slot: 1 | 2 = this.players.size === 0 ? 1 : 2
    this.players.set(conn.id, {
      id: conn.id,
      name: 'Player',
      avatar: '🦊',
      slot,
      ready: false,
      finished: null,
    })
    if (!this.hostId) this.hostId = conn.id
  }

  onMessage(raw: string, sender: Party.Connection) {
    this.bumpIdle()
    let msg: In
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    const me = this.players.get(sender.id)
    if (!me) return

    switch (msg.type) {
      case 'hello': {
        me.name = String(msg.name || 'Player').slice(0, 16)
        me.avatar = String(msg.avatar || '🦊').slice(0, 8)
        if (sender.id === this.hostId || !this.skillId) {
          this.skillId = String(msg.skillId || '')
        }
        this.send(sender, {
          type: 'joined',
          selfId: sender.id,
          isHost: sender.id === this.hostId,
          skillId: this.skillId,
          roster: this.roster(),
        })
        this.broadcastRoster()
        break
      }
      case 'ready': {
        me.ready = !!msg.ready
        this.broadcastRoster()
        this.maybeStart()
        break
      }
      case 'ping': {
        this.send(sender, { type: 'pong', t: msg.t, s: Date.now() })
        break
      }
      case 'progress': {
        this.relay(sender.id, { type: 'oppProgress', q: msg.q, score: msg.score })
        break
      }
      case 'finish': {
        me.finished = { correct: msg.correct, score: msg.score, timeMs: msg.timeMs }
        this.relay(sender.id, {
          type: 'oppFinish',
          correct: msg.correct,
          score: msg.score,
          timeMs: msg.timeMs,
        })
        break
      }
      case 'rematch': {
        this.started = false
        for (const p of this.players.values()) {
          p.ready = false
          p.finished = null
        }
        this.room.broadcast(JSON.stringify({ type: 'rematch' } satisfies Out))
        this.broadcastRoster()
        break
      }
    }
  }

  onClose(conn: Party.Connection) {
    this.bumpIdle()
    if (!this.players.has(conn.id)) return
    this.players.delete(conn.id)
    this.started = false
    if (this.hostId === conn.id) {
      this.hostId = this.players.size ? [...this.players.values()][0].id : null
    }
    for (const p of this.players.values()) {
      p.ready = false
      p.finished = null
      p.slot = 1
    }
    this.room.broadcast(JSON.stringify({ type: 'oppLeft' } satisfies Out))
    this.broadcastRoster()
  }

  private maybeStart() {
    if (this.started) return
    if (this.players.size !== 2) return
    if (![...this.players.values()].every((p) => p.ready)) return
    this.started = true
    for (const p of this.players.values()) p.finished = null
    const startAt = Date.now() + 3200
    const seed = Math.random().toString(36).slice(2, 12)
    this.room.broadcast(
      JSON.stringify({ type: 'start', startAt, seed, skillId: this.skillId } satisfies Out),
    )
  }

  private roster(): RosterEntry[] {
    return [...this.players.values()]
      .sort((a, b) => a.slot - b.slot)
      .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, slot: p.slot, ready: p.ready }))
  }

  private broadcastRoster() {
    this.room.broadcast(JSON.stringify({ type: 'roster', roster: this.roster() } satisfies Out))
  }

  private relay(fromId: string, msg: Out) {
    const s = JSON.stringify(msg)
    for (const c of this.room.getConnections()) {
      if (c.id !== fromId) c.send(s)
    }
  }

  private send(conn: Party.Connection, msg: Out) {
    conn.send(JSON.stringify(msg))
  }

  private bumpIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      for (const c of this.room.getConnections()) c.close()
    }, IDLE_ROOM_MS)
  }
}
