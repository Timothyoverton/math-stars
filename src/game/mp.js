// Glue between the transport (net.js) and the phase machine (store.js). Kept out
// of net.js so that stays a pure transport, and out of the components so the
// lobby / match / result screens only ever read state.

import { useEffect } from 'react'
import * as net from './net.js'
import { Store } from './persist/index.js'
import { session } from './session.js'
import { SKILLS } from './skills.js'
import { enterLobby, startMatchCountdown, toMenu, getState } from './store.js'

const AVATARS = ['🦊', '🐼', '🐸', '🦉', '🐙', '🦄', '🐝', '🐬']

async function selfIdentity() {
  const profile = (await Store.getProfile()) || session.profile || {}
  return {
    name: (profile.name || 'Player').slice(0, 16),
    avatar: profile.avatar || '🦊',
  }
}

// Called once on app start. If the page was opened from a Star Race link
// (?join=CODE) join that room as a guest. The host's skill flows down in the
// `start` message, so unlike speed-racer there's nothing to preload and no
// reload dance.
export function bootstrapMultiplayer() {
  const code = net.pendingJoin()
  if (!code) return false
  net.clearJoinParams()
  joinRace(code)
  return true
}

export async function hostRace(skillId) {
  const code = net.newRoomCode()
  const me = await selfIdentity()
  net.connect({ roomCode: code, ...me, skillId, isHost: true })
  enterLobby()
  return code
}

export async function joinRace(code) {
  const me = await selfIdentity()
  // guest's skillId is a placeholder; the host's wins on the server
  net.connect({ roomCode: code, ...me, skillId: SKILLS[0].id, isHost: false })
  enterLobby()
}

export function leaveRace() {
  net.disconnect()
  toMenu()
}

// If both players picked the same avatar, nudge the guest onto a free one so the
// HUD rows stay distinguishable.
function dedupeAvatar(roster) {
  const me = roster.find((p) => p.id === net.session.selfId)
  const them = roster.find((p) => p.id !== net.session.selfId)
  if (!me || !them || me.slot === 1) return
  if (me.avatar !== them.avatar) return
  const free = AVATARS.find((a) => a !== them.avatar)
  if (free) net.updateProfile({ avatar: free })
}

export function useMultiplayerCoordinator() {
  useEffect(() => {
    const offs = [
      net.on('roster', dedupeAvatar),
      net.on('start', () => {
        const ph = getState().phase
        if (ph === 'lobby' || ph === 'result') startMatchCountdown()
      }),
      net.on('rematch', () => enterLobby()),
      net.on('full', () => {
        net.disconnect()
        toMenu()
        setTimeout(() => alert('That race is already full.'), 0)
      }),
      net.on('oppLeft', () => {
        if (getState().phase === 'countdown') enterLobby()
      }),
    ]
    return () => offs.forEach((f) => f())
  }, [])
}
