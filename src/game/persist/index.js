// The one async facade every persistent read/write goes through. Nothing else
// in the app touches storage. Every method is async even though sessionStorage
// is synchronous, so dropping in remoteAdapter.js later never touches a caller.

import { sessionAdapter } from './sessionAdapter.js'
import { memoryAdapter } from './memoryAdapter.js'
import { starsForAccuracy, MASTERY_WINDOW, STAR_THRESHOLDS } from '../scoring.js'

// Versioned keys. A schema change bumps v1 and migrates or discards cleanly.
const K = {
  profile: 'math-stars:v1:profile',
  progress: 'math-stars:v1:progress',
  history: 'math-stars:v1:history',
  collection: 'math-stars:v1:collection',
}

const HISTORY_MAX = 200

function pickAdapter() {
  const which = import.meta.env?.VITE_STORE
  if (which === 'memory') return memoryAdapter
  return sessionAdapter // <- NOW. remoteAdapter.js is the drop-in later.
}

let adapter = pickAdapter()

// tests / tooling can swap the adapter without reaching into module internals
export function _setAdapter(a) {
  adapter = a
}

const DEFAULT_PROFILE = { id: null, name: '', avatar: '🦊', yearLevel: 4 }

export const Store = {
  async getProfile() {
    const p = await adapter.read(K.profile)
    return p ? { ...DEFAULT_PROFILE, ...p } : null
  },

  async setProfile(patch) {
    const current = (await adapter.read(K.profile)) || DEFAULT_PROFILE
    const next = { ...current, ...patch }
    if (!next.id) next.id = crypto.randomUUID()
    await adapter.write(K.profile, next)
    return next
  },

  async getProgress() {
    return (await adapter.read(K.progress)) || {}
  },

  // Append one finished activity to history and roll it into per-skill progress.
  // `result` — { skillId, total, correct, score, timeMs, mode, at? }
  async recordActivity(result) {
    const at = result.at || Date.now()
    const entry = { ...result, at }

    const history = (await adapter.read(K.history)) || []
    history.unshift(entry)
    if (history.length > HISTORY_MAX) history.length = HISTORY_MAX
    await adapter.write(K.history, history)

    const progress = (await adapter.read(K.progress)) || {}
    const prev = progress[result.skillId] || {
      attempts: 0,
      correct: 0,
      recent: [], // 1 / 0 per recent question, newest last
      mastery: 0,
      stars: 0,
      best: 0,
    }

    const recent = prev.recent.concat(
      Array.from({ length: result.total }, (_, i) => (i < result.correct ? 1 : 0)),
    )
    // keep the window; a set is 20 questions so this holds ~1 set
    while (recent.length > MASTERY_WINDOW) recent.shift()
    const mastery = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0

    progress[result.skillId] = {
      attempts: prev.attempts + result.total,
      correct: prev.correct + result.correct,
      recent,
      mastery,
      stars: STAR_THRESHOLDS.filter((t) => mastery >= t).length,
      best: Math.max(prev.best, result.score),
    }
    await adapter.write(K.progress, progress)

    return {
      progress: progress[result.skillId],
      prevStars: prev.stars,
      setStars: starsForAccuracy(result.total ? result.correct / result.total : 0),
      newBest: result.score > prev.best,
    }
  },

  async getHistory({ limit = 20 } = {}) {
    const history = (await adapter.read(K.history)) || []
    return history.slice(0, limit)
  },

  async getStars() {
    const progress = (await adapter.read(K.progress)) || {}
    return Object.values(progress).reduce((sum, p) => sum + (p.stars || 0), 0)
  },

  async getCollection() {
    return (await adapter.read(K.collection)) || {}
  },

  // Drop one gem into the collection bag. Returns the updated entry plus
  // whether this is the first time this exact gem has been earned.
  async awardGem(gemId, at = Date.now()) {
    const collection = (await adapter.read(K.collection)) || {}
    const prev = collection[gemId]
    collection[gemId] = {
      count: (prev?.count || 0) + 1,
      firstAt: prev?.firstAt || at,
      lastAt: at,
    }
    await adapter.write(K.collection, collection)
    return { ...collection[gemId], isNew: !prev }
  },

  async getGemCount() {
    const collection = (await adapter.read(K.collection)) || {}
    return Object.values(collection).reduce((sum, g) => sum + (g.count || 0), 0)
  },

  async reset() {
    await adapter.remove(K.profile)
    await adapter.remove(K.progress)
    await adapter.remove(K.history)
    await adapter.remove(K.collection)
  },
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__store = Object.assign(window.__store || {}, { Store })
}
