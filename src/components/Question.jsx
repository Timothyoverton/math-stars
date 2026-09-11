import { useEffect, useRef, useState } from 'react'
import Numpad from './Numpad.jsx'
import MathExpr from './MathExpr.jsx'

// One question with its input. Number pad for typed answers, big buttons for a
// multiple-choice question. Calls onAnswer(value) exactly once per question;
// the parent advances by swapping the `question` prop.
export default function Question({ question, onAnswer }) {
  const [entry, setEntry] = useState('')
  const lockedRef = useRef(false)

  // reset for each new question
  useEffect(() => {
    setEntry('')
    lockedRef.current = false
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

  // physical keyboard support (handy on a laptop; the specs type here too)
  useEffect(() => {
    if (question.choices) return
    function onKeyDown(e) {
      if (e.key >= '0' && e.key <= '9') edit('digit', e.key)
      else if (e.key === 'Backspace') edit('back')
      else if (e.key === '.') edit('dot')
      else if (e.key === '-') edit('sign')
      else if (e.key === 'Enter') submit()
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
      <MathExpr className="prompt" text={question.prompt} />

      {question.choices ? (
        <div className="choices">
          {question.choices.map((c) => (
            <button key={c} className="choice" aria-label={c} onClick={() => choose(c)}>
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
