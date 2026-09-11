// Seeded RNG so solo and head-to-head share one question-generation code path
// and a race is exactly reproducible from a single server-sent `seed`.

// mulberry32 — tiny, fast, good enough for a quiz.
export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Turn any string / number into a 32-bit seed.
export function hashSeed(input) {
  const s = String(input)
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// A small RNG toolkit passed to each skill's generate().
export function makeRng(seed) {
  const next = mulberry32(typeof seed === 'number' ? seed : hashSeed(seed))
  const rng = {
    next,
    // integer in [min, max] inclusive
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1))
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)]
    },
    shuffle(arr) {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },
  }
  return rng
}
