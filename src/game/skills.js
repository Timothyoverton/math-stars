// The curriculum. Adding a skill is exactly one object in this list with a
// generate(rng) -> { prompt, answer, choices? }. No other wiring anywhere.
//
//   id       stable key, used in storage and the ?join= link
//   label    shown in the picker and on the result screen
//   strand   grouping for the progress view
//   grade    school grade this is drawn from (Khan Academy K-8 scope/sequence)
//   generate takes the seeded rng from rng.js so solo and race share a path
//
// A generator returning `choices` renders as multiple-choice; otherwise the
// number pad (which has a decimal point and a sign key). `answer` is the
// canonical value; comparison is in questions.js/isCorrect (numeric, tolerant
// of "+", and fraction-equivalent so "2/4" matches "1/2").
//
// Text-only arithmetic only — geometry, data and coordinate-plane strands from
// the Khan sequence need diagrams and are out of scope for a generated quiz.

// ---- shared helpers ---------------------------------------------------

function nearbyInts(rng, answer, count, spread) {
  const out = new Set()
  let guard = 0
  while (out.size < count && guard++ < 80) {
    const v = answer + rng.int(-spread, spread)
    if (v !== answer && Number.isFinite(v)) out.add(v)
  }
  let n = answer + 1
  while (out.size < count) out.add(n++)
  return [...out]
}

function intChoices(rng, answer, spread = 5) {
  return rng.shuffle([answer, ...nearbyInts(rng, answer, 3, spread)]).map(String)
}

function gcd(a, b) {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a || 1
}

function fracStr(n, d) {
  const g = gcd(n, d)
  return `${n / g}/${d / g}`
}

function fracChoices(rng, n, d) {
  const right = fracStr(n, d)
  const pool = new Set([right])
  let guard = 0
  while (pool.size < 4 && guard++ < 60) {
    const dn = n + rng.int(-2, 2)
    const dd = d + rng.pick([-2, -1, 0, 1, 2])
    if (dn > 0 && dd > 1) pool.add(fracStr(dn, dd))
  }
  let k = 2
  while (pool.size < 4) pool.add(fracStr(n + k, d + k++))
  return rng.shuffle([...pool])
}

// ---- the list -------------------------------------------------------

export const SKILLS = [
  // --- Grade 3: addition, subtraction, times tables ---
  {
    id: 'add',
    label: 'Addition within 1,000',
    strand: 'Addition & subtraction',
    grade: 3,
    generate(rng) {
      const a = rng.int(20, 899)
      const b = rng.int(20, 999 - a)
      return { prompt: `${a} + ${b}`, answer: a + b }
    },
  },
  {
    id: 'sub',
    label: 'Subtraction within 1,000',
    strand: 'Addition & subtraction',
    grade: 3,
    generate(rng) {
      const a = rng.int(100, 999)
      const b = rng.int(10, a - 1)
      return { prompt: `${a} − ${b}`, answer: a - b }
    },
  },
  {
    id: 'mul',
    label: 'Multiplication facts to 12×12',
    strand: 'Multiplication & division',
    grade: 3,
    generate(rng) {
      const a = rng.int(2, 12)
      const b = rng.int(2, 12)
      return { prompt: `${a} × ${b}`, answer: a * b }
    },
  },
  {
    id: 'div',
    label: 'Division facts',
    strand: 'Multiplication & division',
    grade: 3,
    generate(rng) {
      const b = rng.int(2, 12)
      const q = rng.int(2, 12)
      return { prompt: `${b * q} ÷ ${b}`, answer: q }
    },
  },

  // --- Grade 4: multi-digit ×, factors, fractions, rounding ---
  {
    id: 'mul1',
    label: 'Multiply 2–3 digits by 1 digit',
    strand: 'Multiplication & division',
    grade: 4,
    generate(rng) {
      const a = rng.int(12, 999)
      const b = rng.int(3, 9)
      return { prompt: `${a} × ${b}`, answer: a * b }
    },
  },
  {
    id: 'mul2',
    label: 'Multiply 2-digit numbers',
    strand: 'Multiplication & division',
    grade: 4,
    generate(rng) {
      const a = rng.int(11, 99)
      const b = rng.int(11, 99)
      return { prompt: `${a} × ${b}`, answer: a * b }
    },
  },
  {
    id: 'round',
    label: 'Rounding whole numbers',
    strand: 'Place value',
    grade: 4,
    generate(rng) {
      const to = rng.pick([10, 100, 1000])
      const n = rng.int(to, to * 90) + rng.int(1, to - 1)
      const answer = Math.round(n / to) * to
      return {
        prompt: `Round ${n} to the nearest ${to}`,
        answer,
        choices: rng
          .shuffle([answer, answer + to, answer - to, Math.round(n / to) * to + (answer >= n ? -to : to)])
          .filter((v, i, a) => a.indexOf(v) === i)
          .map(String),
      }
    },
  },
  {
    id: 'primes',
    label: 'Prime or composite?',
    strand: 'Factors & multiples',
    grade: 4,
    generate(rng) {
      const n = rng.int(4, 97)
      let prime = n > 1
      for (let i = 2; i * i <= n; i++) if (n % i === 0) prime = false
      return { prompt: `Is ${n} prime or composite?`, answer: prime ? 'prime' : 'composite', choices: ['prime', 'composite'] }
    },
  },
  {
    id: 'fracadd',
    label: 'Add fractions (same denominator)',
    strand: 'Fractions',
    grade: 4,
    generate(rng) {
      const d = rng.pick([3, 4, 5, 6, 8, 10])
      const a = rng.int(1, d - 1)
      const b = rng.int(1, d - 1)
      return { prompt: `${a}/${d} + ${b}/${d}`, answer: fracStr(a + b, d), choices: fracChoices(rng, a + b, d) }
    },
  },
  {
    id: 'fraccompare',
    label: 'Compare fractions',
    strand: 'Fractions',
    grade: 4,
    generate(rng) {
      const d1 = rng.pick([2, 3, 4, 5, 6, 8])
      const d2 = rng.pick([2, 3, 4, 5, 6, 8])
      const n1 = rng.int(1, d1 - 1)
      const n2 = rng.int(1, d2 - 1)
      const lhs = n1 / d1
      const rhs = n2 / d2
      const answer = lhs < rhs ? '<' : lhs > rhs ? '>' : '='
      return { prompt: `${n1}/${d1}  ?  ${n2}/${d2}`, answer, choices: ['<', '=', '>'] }
    },
  },

  // --- Grade 5: decimals, fraction of a quantity, fraction × ---
  {
    id: 'fracqty',
    label: 'Fractions of a quantity',
    strand: 'Fractions',
    grade: 5,
    generate(rng) {
      const den = rng.pick([2, 3, 4, 5, 6, 10])
      const num = rng.int(1, den - 1)
      const whole = den * rng.int(2, 12)
      return { prompt: `${num}/${den} of ${whole}`, answer: (whole / den) * num }
    },
  },
  {
    id: 'decadd',
    label: 'Add & subtract decimals',
    strand: 'Decimals',
    grade: 5,
    generate(rng) {
      const a = rng.int(15, 900) / 10
      const b = rng.int(10, 400) / 10
      if (rng.next() < 0.5) return { prompt: `${a.toFixed(1)} + ${b.toFixed(1)}`, answer: Math.round((a + b) * 10) / 10 }
      const hi = Math.max(a, b)
      const lo = Math.min(a, b)
      return { prompt: `${hi.toFixed(1)} − ${lo.toFixed(1)}`, answer: Math.round((hi - lo) * 10) / 10 }
    },
  },
  {
    id: 'fracmul',
    label: 'Multiply fractions',
    strand: 'Fractions',
    grade: 5,
    generate(rng) {
      const d1 = rng.int(2, 6)
      const d2 = rng.int(2, 6)
      const n1 = rng.int(1, d1 - 1)
      const n2 = rng.int(1, d2 - 1)
      return {
        prompt: `${n1}/${d1} × ${n2}/${d2}`,
        answer: fracStr(n1 * n2, d1 * d2),
        choices: fracChoices(rng, n1 * n2, d1 * d2),
      }
    },
  },

  // --- Grade 6: order of operations, exponents, percent, LCM ---
  {
    id: 'ooo',
    label: 'Order of operations',
    strand: 'Number',
    grade: 6,
    generate(rng) {
      const a = rng.int(2, 9)
      const b = rng.int(2, 9)
      const c = rng.int(2, 9)
      if (rng.next() < 0.5) {
        const answer = a + b * c
        return { prompt: `${a} + ${b} × ${c}`, answer, choices: intChoices(rng, answer, 8) }
      }
      const answer = a * b - c
      return { prompt: `${a} × ${b} − ${c}`, answer, choices: intChoices(rng, answer, 8) }
    },
  },
  {
    id: 'exponents',
    label: 'Powers and exponents',
    strand: 'Number',
    grade: 6,
    generate(rng) {
      const base = rng.int(2, 9)
      const exp = rng.int(2, base <= 3 ? 4 : 3)
      return { prompt: `${base}^${exp}`, answer: base ** exp }
    },
  },
  {
    id: 'percent',
    label: 'Percent of a number',
    strand: 'Ratios & percentages',
    grade: 6,
    generate(rng) {
      const pct = rng.pick([10, 20, 25, 50, 75, 5, 30, 40])
      const base = rng.pick([20, 40, 60, 80, 100, 120, 200, 50, 160])
      return { prompt: `${pct}% of ${base}`, answer: (pct / 100) * base }
    },
  },
  {
    id: 'lcm',
    label: 'Lowest common multiple',
    strand: 'Factors & multiples',
    grade: 6,
    generate(rng) {
      const a = rng.int(2, 12)
      const b = rng.int(2, 12)
      const answer = (a * b) / gcd(a, b)
      return { prompt: `LCM of ${a} and ${b}`, answer, choices: intChoices(rng, answer, Math.max(4, answer >> 2)) }
    },
  },

  // --- Grade 7: integer arithmetic with negatives ---
  {
    id: 'negadd',
    label: 'Adding & subtracting negatives',
    strand: 'Negative numbers',
    grade: 7,
    generate(rng) {
      const a = rng.int(-15, 15)
      const b = rng.int(-15, 15)
      const op = rng.pick(['+', '−'])
      const rhs = op === '+' ? b : -b
      const shown = b < 0 ? `(${b})` : `${b}`
      return { prompt: `${a} ${op} ${shown}`, answer: a + rhs }
    },
  },
]

export const SKILLS_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]))

export function getSkill(id) {
  return SKILLS_BY_ID[id] || null
}

// picker groups skills under their grade
export const SKILLS_BY_GRADE = SKILLS.reduce((acc, s) => {
  ;(acc[s.grade] ||= []).push(s)
  return acc
}, {})
