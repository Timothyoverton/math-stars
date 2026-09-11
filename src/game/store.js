import { useSyncExternalStore } from 'react'

// The one React store: a coarse phase machine, sampled with useSyncExternalStore.
//
//   menu -> [warmup ->] practice -> result            (solo)
//   menu -> lobby -> countdown -> match -> result   (Star Race)
//
// `warmup` is optional — <Menu> only routes through it for a skill with no
// progress yet (see startWarmup). It's 5 unscored questions from the same
// generator, then it hands straight off to startPractice() for the real set.
//
// Per-answer state (current question, score, streak) is NOT here — it lives as
// ordinary React state inside <Practice> / <Match>. A quiz has no per-frame
// loop, so only opponent packets need the out-of-React singleton (see net.js).

const listeners = new Set()

let state = {
  phase: 'menu', // 'menu' | 'warmup' | 'practice' | 'lobby' | 'countdown' | 'match' | 'result'
  skillId: null, // skill picked for the current practice / race
  runId: 0, // bump to force a fresh <Practice> / <Match> mount
  multiplayer: false, // is the current countdown/match/result a two-player one
  result: null, // set on entering 'result' — see finishActivity / finishMatch
}

function emit() {
  for (const l of listeners) l()
}
function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function getState() {
  return state
}
export function setState(patch) {
  const next = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...next }
  emit()
}

export function usePhase() {
  return useSyncExternalStore(subscribe, () => state.phase)
}
export function useSkillId() {
  return useSyncExternalStore(subscribe, () => state.skillId)
}
export function useRunId() {
  return useSyncExternalStore(subscribe, () => state.runId)
}
export function useMultiplayer() {
  return useSyncExternalStore(subscribe, () => state.multiplayer)
}
export function useResult() {
  return useSyncExternalStore(subscribe, () => state.result)
}

// --- transitions ---

export function startWarmup(skillId) {
  setState((s) => ({
    phase: 'warmup',
    skillId,
    runId: s.runId + 1,
    multiplayer: false,
    result: null,
  }))
}

export function startPractice(skillId) {
  setState((s) => ({
    phase: 'practice',
    skillId,
    runId: s.runId + 1,
    multiplayer: false,
    result: null,
  }))
}

export function finishActivity(result) {
  // result: { mode:'solo', skillId, total, correct, accuracy, score, timeMs, stars, best }
  setState({ phase: 'result', result })
}

export function enterLobby() {
  setState({ phase: 'lobby', multiplayer: true, result: null })
}

export function startMatchCountdown() {
  setState((s) => ({ phase: 'countdown', runId: s.runId + 1, result: null, multiplayer: true }))
}

export function beginMatch() {
  setState({ phase: 'match' })
}

export function finishMatch(result) {
  // result: { mode:'race', skillId, self:{...}, opp:{...}|null, outcome:'win'|'lose'|'draw'|'forfeit' }
  setState({ phase: 'result', result })
}

export function toMenu() {
  setState({ phase: 'menu', multiplayer: false, result: null })
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__store = { getState, setState }
}
