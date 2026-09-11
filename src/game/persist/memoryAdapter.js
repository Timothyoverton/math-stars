// In-memory adapter for tests — same contract, no browser storage.

export function makeMemoryAdapter(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    async read(key) {
      return map.has(key) ? JSON.parse(map.get(key)) : null
    },
    async write(key, value) {
      map.set(key, JSON.stringify(value))
    },
    async remove(key) {
      map.delete(key)
    },
  }
}

export const memoryAdapter = makeMemoryAdapter()
