// A little synthesized chime for a 3-star set / a new best / a race win — a
// Web Audio triad, same spirit as the CSS-drawn gems: no audio asset to ship.
// Best-effort only: silently no-ops if AudioContext isn't available or the
// browser blocks it (no user gesture yet, reduced-motion browsers that also
// restrict autoplay, etc.) — a celebration that fails to play a sound still
// shows visually, so this never throws.

let ctx

export function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    ctx ||= new Ctx()
    if (ctx.state === 'suspended') ctx.resume()

    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99] // C5 E5 G5 — a bright little triad
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.09
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  } catch {
    /* no audio available — the visual celebration still shows */
  }
}
