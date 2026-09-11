// Number pad for typed answers. Controlled by the parent: it holds the string,
// we just emit key presses. Includes a decimal point (decimals strand) and a
// sign key (negative-numbers strand).
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '±']

export default function Numpad({ onKey, onEnter, onBack, canEnter }) {
  return (
    <>
      <div className="numpad">
        {KEYS.map((k) => (
          <button
            key={k}
            className="key"
            onClick={() => {
              if (k === '±') onKey('sign')
              else if (k === '.') onKey('dot')
              else onKey(k)
            }}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn secondary" onClick={onBack}>
          ⌫ Delete
        </button>
        <button className="btn" disabled={!canEnter} onClick={onEnter}>
          Enter
        </button>
      </div>
    </>
  )
}
