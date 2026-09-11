import { makeRng } from './rng.js'
import { getSkill } from './skills.js'

export const QUESTIONS_PER_SET = 20

// Build the whole question set up front from one seed. Both players in a race
// call this with the same (seed, skillId) and get byte-identical questions —
// the relay never sees a question or an answer.
//
// `seed` is a string in a race (server-sent) or a random one for solo.
export function buildQuestionSet(seed, skillId, count = QUESTIONS_PER_SET) {
  const skill = getSkill(skillId)
  if (!skill) throw new Error(`unknown skill: ${skillId}`)
  const rng = makeRng(`${seed}:${skillId}`)
  const out = []
  const seen = new Set()
  let guard = 0
  while (out.length < count && guard++ < count * 20) {
    const q = skill.generate(rng)
    // light de-duplication so a 20-set doesn't repeat the same prompt
    if (seen.has(q.prompt)) continue
    seen.add(q.prompt)
    out.push({
      prompt: q.prompt,
      answer: q.answer,
      choices: q.choices || null,
    })
  }
  // if the skill's space is smaller than `count`, allow repeats to fill
  while (out.length < count) {
    const q = skill.generate(rng)
    out.push({ prompt: q.prompt, answer: q.answer, choices: q.choices || null })
  }
  return out
}

export function randomSeed() {
  return Math.random().toString(36).slice(2, 10)
}

// Canonical answer comparison — trims, tolerates a leading "+", numeric match,
// and fraction equivalence ("2/4" matches "1/2").
export function isCorrect(given, answer) {
  const g = String(given).trim()
  const a = String(answer).trim()
  if (g === '') return false
  if (g === a) return true

  const gf = asFraction(g)
  const af = asFraction(a)
  if (gf && af) return gf[0] * af[1] === af[0] * gf[1]

  const gn = Number(g.replace(/^\+/, ''))
  const an = Number(answer)
  return Number.isFinite(gn) && Number.isFinite(an) && gn === an
}

function asFraction(s) {
  const m = /^(-?\d+)\s*\/\s*(\d+)$/.exec(s)
  if (m) return [Number(m[1]), Number(m[2])]
  const n = Number(s)
  return Number.isFinite(n) ? [n, 1] : null
}
