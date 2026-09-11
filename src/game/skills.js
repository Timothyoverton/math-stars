// The curriculum. Adding a skill is exactly one object with a
// generate(rng) -> { prompt, answer, choices? }. No other wiring anywhere.
//
//   id       stable key, used in storage and the ?join= link
//   label    shown in the picker and on the result screen
//   strand   grouping for the progress view
//   grade    school grade this is drawn from (Khan Academy K-8 scope/sequence)
//   mixed    true for a strand-level "unit test" that draws from several skills
//   generate takes the seeded rng from rng.js so solo and race share a path
//
// A generator returning `choices` renders as multiple-choice; otherwise the
// number pad (which has a decimal point and a sign key). `answer` is the
// canonical value; comparison is in questions.js/isCorrect (numeric, tolerant
// of "+", and fraction-equivalent so "2/4" matches "1/2").
//
// Text-only arithmetic — geometry, measurement, data and coordinate-plane
// strands from the Khan sequence need diagrams and are out of scope here.

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

// round away float noise; String() already drops a trailing ".0"
function num(n) {
  return String(Math.round(n * 100) / 100)
}

function signed(n) {
  return n < 0 ? `(${n})` : `${n}`
}

// ---- base skills ---------------------------------------------------

export const BASE_SKILLS = [
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
  {
    id: 'addsubword',
    label: 'Word problems: add & subtract',
    strand: 'Addition & subtraction',
    grade: 3,
    generate(rng) {
      const name = rng.pick(['Sam', 'Mia', 'Leo', 'Ava', 'Noah', 'Zoe', 'Kai', 'Ella'])
      const thing = rng.pick([
        'stickers',
        'marbles',
        'trading cards',
        'stamps',
        'seashells',
        'baseball cards',
      ])
      if (rng.next() < 0.5) {
        const a = rng.int(20, 600)
        const b = rng.int(20, 999 - a)
        const prompt = rng.pick([
          `${name} has ${a} ${thing}. A friend gives them ${b} more — how many ${thing} does ${name} have now?`,
          `${name} collected ${a} ${thing} on Saturday and ${b} more on Sunday. How many ${thing} in total?`,
          `There were ${a} ${thing} in one box and ${b} in another. How many ${thing} altogether?`,
        ])
        return { prompt, answer: a + b }
      }
      const a = rng.int(100, 999)
      const b = rng.int(10, a - 1)
      const prompt = rng.pick([
        `${name} had ${a} ${thing} and gave away ${b}. How many ${thing} are left?`,
        `A shop had ${a} ${thing} in stock and sold ${b} of them. How many ${thing} are left?`,
        `${name} started with ${a} ${thing} but lost ${b}. How many ${thing} remain?`,
      ])
      return { prompt, answer: a - b }
    },
  },

  // --- Grade 4: multi-digit ×, division w/ remainder, factors, place value, fractions, rounding ---
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
    id: 'divrem',
    label: 'Divide with remainders',
    strand: 'Multiplication & division',
    grade: 4,
    generate(rng) {
      const divisor = rng.int(3, 9)
      const q = rng.int(4, 12)
      const r = rng.int(1, divisor - 1)
      const dividend = divisor * q + r
      const right = `${q} r ${r}`
      const pool = new Set()
      pool.add(`${q - 1} r ${r}`)
      pool.add(`${q + 1} r ${r}`)
      for (let alt = 1; alt < divisor && pool.size < 6; alt++) {
        if (alt !== r) pool.add(`${q} r ${alt}`)
      }
      pool.delete(right)
      const wrongs = rng.shuffle([...pool]).slice(0, 3)
      const choices = rng.shuffle([right, ...wrongs])
      return { prompt: `${dividend} ÷ ${divisor}`, answer: right, choices }
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
      return {
        prompt: `Is ${n} prime or composite?`,
        answer: prime ? 'prime' : 'composite',
        choices: ['prime', 'composite'],
      }
    },
  },
  {
    id: 'placevalue',
    label: 'Value of a digit',
    strand: 'Place value',
    grade: 4,
    generate(rng) {
      let n, digits, pos, digit
      do {
        n = rng.int(1000, 9999)
        digits = String(n).split('').map(Number)
        pos = rng.int(0, 3)
        digit = digits[pos]
      } while (digit === 0 || digits.filter((d) => d === digit).length > 1)
      const place = [1000, 100, 10, 1][pos]
      return { prompt: `What is the ${digit} worth in ${n}?`, answer: digit * place }
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
          .shuffle([answer, answer + to, answer - to, answer + 2 * to])
          .filter((v, i, a) => a.indexOf(v) === i)
          .map(String),
      }
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
      return {
        prompt: `${a}/${d} + ${b}/${d}`,
        answer: fracStr(a + b, d),
        choices: fracChoices(rng, a + b, d),
      }
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

  // --- Grade 5: fraction of a quantity, decimals, powers of ten, fraction ×/÷ ---
  {
    id: 'fracqty',
    label: 'Fractions of a quantity',
    strand: 'Fractions',
    grade: 5,
    generate(rng) {
      const den = rng.pick([2, 3, 4, 5, 6, 10])
      const numr = rng.int(1, den - 1)
      const whole = den * rng.int(2, 12)
      return { prompt: `${numr}/${den} of ${whole}`, answer: (whole / den) * numr }
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
      if (rng.next() < 0.5)
        return { prompt: `${a.toFixed(1)} + ${b.toFixed(1)}`, answer: Math.round((a + b) * 10) / 10 }
      const hi = Math.max(a, b)
      const lo = Math.min(a, b)
      return { prompt: `${hi.toFixed(1)} − ${lo.toFixed(1)}`, answer: Math.round((hi - lo) * 10) / 10 }
    },
  },
  {
    id: 'powersoften',
    label: 'Multiply & divide by 10, 100, 1000',
    strand: 'Decimals',
    grade: 5,
    generate(rng) {
      const p = rng.pick([10, 100, 1000])
      if (rng.next() < 0.5) {
        const x = Math.round((rng.int(2, 999) / rng.pick([1, 1, 10])) * 10) / 10
        return { prompt: `${num(x)} × ${p}`, answer: Math.round(x * p * 10) / 10 }
      }
      const ans = Math.round((rng.int(2, 999) / rng.pick([1, 1, 10])) * 10) / 10
      return { prompt: `${num(ans * p)} ÷ ${p}`, answer: ans }
    },
  },
  {
    id: 'muldec',
    label: 'Multiply decimals',
    strand: 'Decimals',
    grade: 5,
    generate(rng) {
      const a = rng.int(2, 9) / 10
      const b = rng.next() < 0.5 ? rng.int(2, 9) / 10 : rng.int(2, 9)
      return { prompt: `${num(a)} × ${num(b)}`, answer: Math.round(a * b * 100) / 100 }
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
  {
    id: 'fracdiv',
    label: 'Divide fractions',
    strand: 'Fractions',
    grade: 5,
    generate(rng) {
      let d1, d2, n1, n2
      do {
        d1 = rng.int(2, 6)
        d2 = rng.int(2, 6)
        n1 = rng.int(1, d1 - 1)
        n2 = rng.int(1, d2 - 1)
      } while ((n1 * d2) % (d1 * n2) === 0) // keep the answer a proper fraction, not a whole number
      return {
        prompt: `${n1}/${d1} ÷ ${n2}/${d2}`,
        answer: fracStr(n1 * d2, d1 * n2),
        choices: fracChoices(rng, n1 * d2, d1 * n2),
      }
    },
  },

  // --- Grade 6: order of operations, exponents, percent, LCM, ratios, rates ---
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
  {
    id: 'ratios',
    label: 'Equivalent ratios',
    strand: 'Ratios & percentages',
    grade: 6,
    generate(rng) {
      const a = rng.int(2, 6)
      let b = rng.int(2, 6)
      while (b === a) b = rng.int(2, 6)
      const f = rng.int(2, 6)
      if (rng.next() < 0.5) return { prompt: `${a} : ${b} = ${a * f} : ?`, answer: b * f }
      return { prompt: `${a * f} : ${b * f} = ${a} : ?`, answer: b }
    },
  },
  {
    id: 'unitrate',
    label: 'Unit rate',
    strand: 'Ratios & percentages',
    grade: 6,
    generate(rng) {
      const per = rng.int(2, 20)
      const groups = rng.int(2, 9)
      const [thing, unit] = rng.pick([
        ['km', 'hours'],
        ['words', 'minutes'],
        ['pages', 'days'],
        ['points', 'games'],
      ])
      return {
        prompt: `${per * groups} ${thing} in ${groups} ${unit} — how many ${thing} in 1?`,
        answer: per,
      }
    },
  },

  // --- Grade 7: multiply/divide negatives, proportions, percent change ---
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
      return { prompt: `${a} ${op} ${signed(b)}`, answer: a + rhs }
    },
  },
  {
    id: 'negmuldiv',
    label: 'Multiplying & dividing negatives',
    strand: 'Negative numbers',
    grade: 7,
    generate(rng) {
      const neg = (lo, hi) => rng.int(lo, hi) * rng.pick([-1, 1])
      let a, b, op, answer
      do {
        op = rng.pick(['×', '÷'])
        if (op === '×') {
          a = neg(2, 9)
          b = neg(2, 9)
          answer = a * b
        } else {
          b = neg(2, 9)
          const q = neg(2, 9)
          a = b * q
          answer = q
        }
      } while (a > 0 && b > 0)
      return { prompt: `${signed(a)} ${op} ${signed(b)}`, answer }
    },
  },
  {
    id: 'proportions',
    label: 'Proportion word problems',
    strand: 'Ratios & percentages',
    grade: 7,
    generate(rng) {
      const per = rng.int(2, 8)
      const base = rng.int(2, 6)
      const scale = rng.int(2, 6)
      const [a, b] = rng.pick([
        ['cups of flour', 'cookies'],
        ['apples', 'baskets'],
        ['litres of paint', 'walls'],
        ['teaspoons', 'cups of tea'],
      ])
      return {
        prompt: `${per} ${a} for ${base} ${b}. How many ${a} for ${base * scale} ${b}?`,
        answer: per * scale,
      }
    },
  },
  {
    id: 'percentchange',
    label: 'Discount (percent off)',
    strand: 'Ratios & percentages',
    grade: 7,
    generate(rng) {
      const pct = rng.pick([10, 20, 25, 50])
      let base, off
      let guard = 0
      do {
        base = rng.int(2, 20) * 10
        off = (base * pct) / 100
      } while (!Number.isInteger(off) && guard++ < 20)
      const thing = rng.pick(['jacket', 'game', 'bike', 'ticket', 'book', 'scooter'])
      return { prompt: `A $${base} ${thing} is ${pct}% off. Sale price?`, answer: base - off }
    },
  },
  {
    id: 'percentincrease',
    label: 'Percent increase, tax & tip',
    strand: 'Ratios & percentages',
    grade: 7,
    generate(rng) {
      const kind = rng.pick(['increase', 'tax', 'tip', 'whatpercent'])

      if (kind === 'whatpercent') {
        const pct = rng.pick([10, 20, 25, 40, 50, 60, 75, 80])
        let base, part
        let guard = 0
        do {
          base = rng.int(2, 20) * 10
          part = (base * pct) / 100
        } while (!Number.isInteger(part) && guard++ < 20)
        return { prompt: `${part} out of ${base} is what percent?`, answer: pct }
      }

      const pct = rng.pick([5, 10, 15, 20, 25, 50])
      let base, add
      let guard = 0
      do {
        base = rng.int(2, 20) * 10
        add = (base * pct) / 100
      } while (!Number.isInteger(add) && guard++ < 20)
      const answer = base + add

      if (kind === 'increase') {
        const thing = rng.pick(['jacket', 'game', 'bike', 'ticket', 'book', 'scooter'])
        return { prompt: `A $${base} ${thing} goes up ${pct}%. New price?`, answer }
      }
      if (kind === 'tax') {
        return { prompt: `A $${base} bill plus ${pct}% sales tax. Total?`, answer }
      }
      return { prompt: `A $${base} meal with a ${pct}% tip. Total?`, answer }
    },
  },
]

// ---- strand-level "unit test" mixed sets -----------------------------
// One object per strand with several skills — its generate() picks a member
// skill each question. Fits the existing model: no buildQuestionSet change.

const MIXED_STRANDS = [
  'Multiplication & division',
  'Fractions',
  'Decimals',
  'Ratios & percentages',
  'Negative numbers',
]

export const MIXED_SKILLS = MIXED_STRANDS.map((strand) => {
  const members = BASE_SKILLS.filter((s) => s.strand === strand)
  return {
    id: `mix-${strand.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`,
    label: strand,
    strand,
    grade: Math.max(...members.map((s) => s.grade)),
    mixed: true,
    generate(rng) {
      return rng.pick(members).generate(rng)
    },
  }
})

export const SKILLS = [...BASE_SKILLS, ...MIXED_SKILLS]

export const SKILLS_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]))

export function getSkill(id) {
  return SKILLS_BY_ID[id] || null
}

// picker groups the single skills under their grade; mixed sets get their own
// section (see MIXED_SKILLS)
export const SKILLS_BY_GRADE = BASE_SKILLS.reduce((acc, s) => {
  ;(acc[s.grade] ||= []).push(s)
  return acc
}, {})
