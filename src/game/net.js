// Star Race transport: talks to the dumb PartyKit relay in party/server.ts.
//
// A quiz has no per-frame loop, so this is much lighter than speed-racer's
// net.js — no interpolation buffer, no telemetry. Opponent packets still arrive
// several times a set and must not re-render the app, so live opponent state is
// a mutable singleton (`netState`) that <Hud> samples on a timer. Coarse
// lobby/match transitions go through the event emitter into store.js.
//
// All scoring is client-side. The server never sees a question or an answer.

import PartySocket from 'partysocket'
import { PARTYKIT_HOST } from './net-config.js'

const PING_INTERVAL = 3000

// ---- live opponent state, sampled by the HUD ---------------------------

export const netState = {
  connected: false,
  oppProgress: null, // { q, score } — how far the opponent has got
  oppFinish: null, // { correct, score, timeMs }
  selfFinish: null, // { correct, score, timeMs }
}

export const session = {
  active: false,
  roomCode: null,
  isHost: false,
  selfId: null,
  skillId: null,
  seed: null,
  roster: [], // [{ id, name, avatar, slot, ready }]
  startAtLocal: null, // Date.now()-domain timestamp of the shared GO
}

// ---- events -----------------------------------------------------------

const listeners = new Map()
export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event).add(fn)
  return () => off(event, fn)
}
export function off(event, fn) {
  listeners.get(event)?.delete(fn)
}
function emit(event, payload) {
  listeners.get(event)?.forEach((fn) => {
    try {
      fn(payload)
    } catch (e) {
      console.error('[net] listener error', e)
    }
  })
}

// ---- room codes -----------------------------------------------------

// no 0/O/1/I/L so a code read off a screen is unambiguous
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function newRoomCode() {
  let s = ''
  const a = crypto.getRandomValues(new Uint32Array(4))
  for (let i = 0; i < 4; i++) s += ALPHABET[a[i] % ALPHABET.length]
  return s
}

export function joinUrl(code) {
  const u = new URL(window.location.href)
  u.hash = ''
  u.search = ''
  u.searchParams.set('join', code)
  return u.toString()
}

export function pendingJoin() {
  const p = new URLSearchParams(window.location.search)
  const code = (p.get('join') || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
  return code.length === 4 ? code : null
}

export function clearJoinParams() {
  const u = new URL(window.location.href)
  u.searchParams.delete('join')
  window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash)
}

// ---- connection ----------------------------------------------------

let socket = null
let pingTimer = null
let pings = []
let clockOffset = 0
let selfProfile = { name: 'Player', avatar: '🦊', skillId: null }

export function connect({ roomCode, name, avatar, skillId, isHost }) {
  disconnect()
  selfProfile = { name, avatar, skillId }
  session.active = true
  session.roomCode = roomCode
  session.isHost = isHost
  session.skillId = skillId
  session.seed = null
  session.roster = []
  session.startAtLocal = null
  netState.oppProgress = null
  netState.oppFinish = null
  netState.selfFinish = null
  pings = []
  clockOffset = 0

  socket = new PartySocket({ host: PARTYKIT_HOST, room: roomCode })

  socket.addEventListener('open', () => {
    netState.connected = true
    send({ type: 'hello', ...selfProfile })
    startPinging()
    emit('open')
  })
  socket.addEventListener('close', () => {
    netState.connected = false
    stopPinging()
    emit('close')
  })
  socket.addEventListener('error', () => emit('neterror'))
  socket.addEventListener('message', (ev) => {
    let msg
    try {
      msg = JSON.parse(ev.data)
    } catch {
      return
    }
    handle(msg)
  })
  return socket
}

export function disconnect() {
  stopPinging()
  if (socket) {
    try {
      socket.close()
    } catch {
      /* ignore */
    }
    socket = null
  }
  session.active = false
  session.roomCode = null
  session.roster = []
  session.startAtLocal = null
  netState.connected = false
  netState.oppProgress = null
  netState.oppFinish = null
  netState.selfFinish = null
}

function send(obj) {
  if (socket && socket.readyState === 1) socket.send(JSON.stringify(obj))
}

// ---- inbound ------------------------------------------------------

function handle(msg) {
  switch (msg.type) {
    case 'full':
      emit('full')
      break

    case 'joined':
      session.selfId = msg.selfId
      session.isHost = msg.isHost
      if (msg.skillId) session.skillId = msg.skillId
      session.roster = msg.roster
      emit('roster', msg.roster)
      emit('joined', msg)
      break

    case 'roster':
      session.roster = msg.roster
      emit('roster', msg.roster)
      break

    case 'pong': {
      const now = Date.now()
      const rtt = now - msg.t
      pings.push({ offset: msg.s + rtt / 2 - now, rtt })
      if (pings.length > 7) pings.shift()
      clockOffset = pings.reduce((best, p) => (p.rtt < best.rtt ? p : best)).offset
      break
    }

    case 'start':
      session.seed = msg.seed
      session.skillId = msg.skillId
      session.startAtLocal = msg.startAt - clockOffset
      emit('start', { startAtLocal: session.startAtLocal, seed: msg.seed, skillId: msg.skillId })
      break

    case 'oppProgress':
      netState.oppProgress = { q: msg.q, score: msg.score }
      break

    case 'oppFinish':
      netState.oppFinish = { correct: msg.correct, score: msg.score, timeMs: msg.timeMs }
      emit('oppFinish', netState.oppFinish)
      break

    case 'oppLeft':
      netState.oppProgress = null
      netState.oppFinish = null
      session.startAtLocal = null
      emit('oppLeft')
      break

    case 'rematch':
      session.seed = null
      session.startAtLocal = null
      netState.oppProgress = null
      netState.oppFinish = null
      netState.selfFinish = null
      emit('rematch')
      break
  }
}

// ---- outbound ----------------------------------------------------

export function updateProfile({ name, avatar }) {
  if (name != null) selfProfile.name = name
  if (avatar != null) selfProfile.avatar = avatar
  send({ type: 'hello', ...selfProfile })
}

export function sendReady(ready) {
  send({ type: 'ready', ready })
}

export function sendRematch() {
  send({ type: 'rematch' })
}

let lastProgressAt = 0
export function sendProgress({ q, score }) {
  if (!session.active) return
  const now = performance.now()
  if (now - lastProgressAt < 180) return // ~5 Hz cap
  lastProgressAt = now
  send({ type: 'progress', q, score })
}

export function sendFinish({ correct, score, timeMs }) {
  netState.selfFinish = { correct, score, timeMs }
  send({ type: 'finish', correct, score, timeMs })
}

// ---- clock sync -------------------------------------------------

function startPinging() {
  stopPinging()
  const tick = () => send({ type: 'ping', t: Date.now() })
  tick()
  pingTimer = setInterval(tick, PING_INTERVAL)
}
function stopPinging() {
  if (pingTimer) clearInterval(pingTimer)
  pingTimer = null
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__net = { netState, session, connect, disconnect, on }
}
