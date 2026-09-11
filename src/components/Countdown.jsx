import { useEffect, useState } from 'react'
import { session } from '../game/net.js'
import { beginMatch } from '../game/store.js'

// Multiplayer only. Paces itself off the shared GO timestamp (session.startAtLocal,
// already converted into our Date.now() domain by net.js) so both players see
// 3-2-1-GO land together.
export default function Countdown() {
  const [label, setLabel] = useState('3')

  useEffect(() => {
    const startAt = session.startAtLocal || Date.now() + 3200
    let done = false

    // setInterval, not rAF — a rAF countdown stalls in a backgrounded tab, which
    // is exactly the same-device "open the link in a second tab" case.
    const id = setInterval(() => {
      const remain = startAt - Date.now()
      if (remain <= 0 && !done) {
        done = true
        clearInterval(id)
        setLabel('GO!')
        setTimeout(beginMatch, 350)
        return
      }
      if (!done) setLabel(String(Math.max(1, Math.ceil(remain / 1000))))
    }, 100)

    return () => clearInterval(id)
  }, [])

  return <div className="countdown">{label}</div>
}
