import { useEffect, useRef, useState } from 'react'
import Numpad from './Numpad.jsx'
import MathExpr from './MathExpr.jsx'

// One question with its input. Number pad for typed answers, big buttons for a
// multiple-choice question. Calls onAnswer(value) exactly once per question;
// the parent advances by swapping the `question` prop.
export default function Question({ question, onAnswer }) {
  const [entry, setEntry] = useState('')
  const lockedRef = useRef(false)
  const promptRef = useRef(null)
  const choiceRefs = useRef([])

  // reset for each new question, and move focus somewhere sensible so a
  // screen reader announces the new question rather than staying silent on
  // whatever element happened to be focused for the previous one: the first
  // choice button when there are choices (it's also the natural start of
  // arrow-key roving focus), otherwise the prompt itself (tabIndex=-1 below —
  // not in the tab order, just a programmatic focus target).
  useEffect(() => {
    setEntry('')
    lockedRef.current = false
    if (question.choices) {
      choiceRefs.current[0]?.focus()
    } else {
      promptRef.current?.focus()
    }
  }, [question])

  function edit(kind, ch) {
    setEntry((s) => {
      if (kind === 'back') return s.slice(0, -1)
      if (kind === 'sign') return s.startsWith('-') ? s.slice(1) : '-' + s
      if (kind === 'dot') return s.includes('.') ? s : (s || '0') + '.'
      if (kind === 'digit') return (s + ch).slice(0, 7)
      return s
    })
  }

  // physical keyboard support (handy on a laptop; the specs type here too) —
  // e.code is checked alongside e.key so a hardware numpad works even where
  // e.key reports something unexpected (NumLock state, some layouts); a
  // typical numpad has no ± key, so its "-" doubles as the sign toggle.
  useEffect(() => {
    if (question.choices) return
    function onKeyDown(e) {
      const numpadDigit = e.code.match(/^Numpad([0-9])$/)
      if ((e.key >= '0' && e.key <= '9') || numpadDigit) {
        edit('digit', numpadDigit ? numpadDigit[1] : e.key)
      } else if (e.key === 'Backspace') edit('back')
      else if (e.key === '.' || e.code === 'NumpadDecimal') edit('dot')
      else if (e.key === '-' || e.code === 'NumpadSubtract') edit('sign')
      else if (e.key === 'Enter' || e.code === 'NumpadEnter') submit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  // keyboard support for multiple-choice questions: arrow keys rove focus
  // among the choice buttons (wrapping at the ends), and a digit key 1..N
  // jumps straight to picking that choice — the button's own onClick does
  // the rest, so this only needs to move focus / trigger a click.
  useEffect(() => {
    if (!question.choices) return
    function onKeyDown(e) {
      const n = question.choices.length
      const current = choiceRefs.current.indexOf(document.activeElement)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = current === -1 ? 0 : (current + 1) % n
        choiceRefs.current[next]?.focus()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = current === -1 ? n - 1 : (current - 1 + n) % n
        choiceRefs.current[prev]?.focus()
      } else if (e.key >= '1' && e.key <= String(n)) {
        choiceRefs.current[Number(e.key) - 1]?.click()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function valid(s) {
    return s !== '' && s !== '-' && s !== '.' && s !== '-.'
  }

  function submit() {
    if (lockedRef.current || question.choices || !valid(entry)) return
    lockedRef.current = true
    onAnswer(entry)
  }

  function choose(c) {
    if (lockedRef.current) return
    lockedRef.current = true
    onAnswer(c)
  }

  return (
    <div>
      <MathExpr className="prompt" text={question.prompt} ref={promptRef} tabIndex={-1} />

      {question.choices ? (
        <div className="choices">
          {question.choices.map((c, i) => (
            <button
              key={c}
              ref={(el) => (choiceRefs.current[i] = el)}
              className="choice"
              aria-label={c}
              onClick={() => choose(c)}
            >
              <MathExpr text={c} />
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="answer-echo">{entry || ' '}</div>
          <Numpad
            onKey={(k) => (k === 'sign' || k === 'dot' ? edit(k) : edit('digit', k))}
            onBack={() => edit('back')}
            onEnter={submit}
            canEnter={valid(entry)}
          />
        </>
      )}
    </div>
  )
}
