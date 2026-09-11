import { useEffect, useState } from 'react'
import { GEMS, TIERS, TIER_LABEL } from '../game/gems.js'
import { Store } from '../game/persist/index.js'

function fmtDate(at) {
  if (!at) return ''
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export default function Collection({ onBack }) {
  const [collection, setCollection] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    Store.getCollection().then(setCollection)
  }, [])

  if (!collection) return null

  const found = GEMS.filter((g) => collection[g.id]).length
  const total = Object.values(collection).reduce((sum, g) => sum + (g.count || 0), 0)
  const sel = selected ? GEMS.find((g) => g.id === selected) : null
  const selEntry = sel ? collection[sel.id] : null

  return (
    <div className="panel">
      <h1>Your collection</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {total} gem{total === 1 ? '' : 's'} · {found} of {GEMS.length} kinds found
      </p>

      {TIERS.map((tier) => {
        const gems = GEMS.filter((g) => g.tier === tier)
        return (
          <div key={tier}>
            <p className="grade-head">{TIER_LABEL[tier]}</p>
            <div className="gem-grid">
              {gems.map((g) => {
                const entry = collection[g.id]
                return (
                  <button
                    key={g.id}
                    className={'gem-slot' + (entry ? '' : ' empty')}
                    onClick={() => setSelected(g.id)}
                  >
                    <span
                      className="gem-stone"
                      style={entry ? { '--g1': g.colors[0], '--g2': g.colors[1] } : undefined}
                      role="img"
                      aria-label={entry ? g.name : 'not yet found'}
                    />
                    <small>{entry ? g.name : '?'}</small>
                    {entry && entry.count > 1 && <span className="gem-count">×{entry.count}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {sel && (
        <div className="gem-detail">
          <span
            className="gem-stone"
            style={selEntry ? { '--g1': sel.colors[0], '--g2': sel.colors[1] } : undefined}
            role="img"
            aria-label={selEntry ? sel.name : 'not yet found'}
          />
          <div>
            <b>{selEntry ? sel.name : `${sel.name} — not found yet`}</b>
            <span className="muted">
              {TIER_LABEL[sel.tier]} gem
              {selEntry
                ? ` · ×${selEntry.count} · first on ${fmtDate(selEntry.firstAt)}`
                : ' · keep practising to find one'}
            </span>
          </div>
        </div>
      )}

      <button className="btn ghost" style={{ marginTop: 18 }} onClick={onBack}>
        Back
      </button>
    </div>
  )
}
