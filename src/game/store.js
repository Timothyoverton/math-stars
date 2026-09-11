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
  // | 'explore' | 'exploreStop'
  skillId: null, // skill picked for the current practice / race
  mastery: null, // rolling mastery (0-1) for skillId going into solo practice, or
  // null — drives adaptive difficulty for a few flagship skills (see skills.js).
  // Never set for warmup/match: a race needs both players generating the same
  // 20 questions, and a never-played skill has no mastery to adapt from.
  daily: false, // this practice run is today's Daily Challenge — a fixed,
  // date-seeded set (see game/daily.js), never adaptive, so it means the
  // same thing for whoever plays it today.
  runId: 0, // bump to force a fresh <Practice> / <Match> mount
  multiplayer: false, // is the current countdown/match/result a two-player one
  result: null, // set on entering 'result' — see finishActivity / finishMatch
  exploreMapIndex: 0, // which map <ExploreMap> is showing
  exploreNodeIndex: 0, // which node on that map <ExploreStop> is playing
  exploreJustCompleted: null, // { mapIndex, nodeIndex, passed, gem } — brief
  // completion banner on returning to 'explore'; cleared on the next node start
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
export function useExploreJustCompleted() {
  return useSyncExternalStore(subscribe, () => state.exploreJustCompleted)
}

// --- transitions ---

export function startWarmup(skillId) {
  setState((s) => ({
    phase: 'warmup',
    skillId,
    mastery: null,
    daily: false,
    runId: s.runId + 1,
    multiplayer: false,
    result: null,
  }))
}

export function startPractice(skillId, mastery = null) {
  setState((s) => ({
    phase: 'practice',
    skillId,
    mastery,
    daily: false,
    runId: s.runId + 1,
    multiplayer: false,
    result: null,
  }))
}

// Today's Daily Challenge — always the day's fixed skill and seed (see
// game/daily.js), no adaptive difficulty, so it's the same set for everyone
// who plays it today.
export function startDailyChallenge(skillId) {
  setState((s) => ({
    phase: 'practice',
    skillId,
    mastery: null,
    daily: true,
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

// --- Explore Mode ---
// menu -> explore (map view) -> exploreStop (one stop/check) -> explore -> ...
// See docs/EXPLORE_MODE.md. Deliberately its own small state slice rather than
// reusing skillId/mastery/daily/result — a stop's completion returns straight
// to the map, not the generic 'result' screen.

export function startExploreMode() {
  setState({
    phase: 'explore',
    multiplayer: false,
    result: null,
    exploreJustCompleted: null,
  })
}

export function startExploreNode(mapIndex, nodeIndex) {
  setState((s) => ({
    phase: 'exploreStop',
    exploreMapIndex: mapIndex,
    exploreNodeIndex: nodeIndex,
    exploreJustCompleted: null,
    runId: s.runId + 1,
  }))
}

// Called by <ExploreStop> on finishing a node's question set. `completed` is
// { mapIndex, nodeIndex, passed, gem } for the just-played node's banner on
// the map view. Returns to 'explore' rather than 'result'.
export function finishExploreNode(completed) {
  setState({ phase: 'explore', exploreJustCompleted: completed })
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__store = { getState, setState }
}
