// sessionStorage-backed adapter. Progress is lost when the tab closes — an
// acceptable prototype cost, and it stops "do the backend later" becoming
// "never". Switching to localStorage is the one-line change below.

const backing = () => window.sessionStorage

export const sessionAdapter = {
  async read(key) {
    try {
      const raw = backing().getItem(key)
      return raw == null ? null : JSON.parse(raw)
    } catch {
      return null
    }
  },
  async write(key, value) {
    try {
      backing().setItem(key, JSON.stringify(value))
    } catch {
      /* quota / private mode — progress just won't persist */
    }
  },
  async remove(key) {
    try {
      backing().removeItem(key)
    } catch {
      /* ignore */
    }
  },
}
