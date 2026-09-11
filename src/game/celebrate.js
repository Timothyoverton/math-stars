// A little synthesized chime for a 3-star set / a new best / a race win — a
// Web Audio triad, same spirit as the CSS-drawn gems: no audio asset to ship.
// Best-effort only: silently no-ops if AudioContext isn't available.
//
// Browsers only let an AudioContext start from a user gesture (Safari is
// strict about this: the create/resume call has to be synchronously inside
// the gesture's own handler, not a tick later). playChime() itself runs from
// a useEffect after the result screen renders — well outside that window —
// so primeAudio() exists to create/resume the context earlier, called
// straight from the onClick of whatever button actually starts a quiz
// (Menu's Practise/Race/bot buttons). Same fix speed-racer uses for its
// DRIVE button.

let ctx

function ensureCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  ctx ||= new Ctx()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function primeAudio() {
  try {
    ensureCtx()
  } catch {
    /* no audio available */
  }
}

// The per-question echoes — a short ding/dip under the "Correct! / Answer: …"
// flash in useQuiz.js, distinct from playChime()'s bigger end-of-set fanfare.
// No negative marking in this app (see CLAUDE.md), so playWrong() stays a
// soft downward dip, not a harsh buzzer — it says "not quite", not "wrong".

export function playCorrect() {
  try {
    const c = ensureCtx()
    if (!c) return
    const now = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880 // A5 — a bright little ding
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    osc.connect(gain).connect(c.destination)
    osc.start(now)
    osc.stop(now + 0.25)
  } catch {
    /* no audio available */
  }
}

export function playWrong() {
  try {
    const c = ensureCtx()
    if (!c) return
    const now = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(392, now) // G4
    osc.frequency.linearRampToValueAtTime(330, now + 0.18) // down to E4
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(gain).connect(c.destination)
    osc.start(now)
    osc.stop(now + 0.32)
  } catch {
    /* no audio available */
  }
}

export function playChime() {
  try {
    ctx = ensureCtx()
    if (!ctx) return

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
