// Renders a prompt / answer string with proper stacked fractions.
//
// Generators still emit plain strings ("3/10 + 4/10", "1/3 of 18", "7/10") so
// storage, the session mirror and the specs stay text. This component is the
// only place a fraction becomes two-decker: it splits on whitespace and turns
// any "a/b" token into a <Fraction>. Everything else (operators, words, the
// "?" in a comparison) renders as-is.
//
// A CSS/flexbox fraction rather than MathML or KaTeX: no dependency, scales with
// font-size, and easy to size against the 44px prompt. MathML <mfrac> is the
// standards answer but renders small and is fiddly to match to the surrounding
// type; KaTeX is ~270 KB of JS + fonts for what is here only ever "a/b".

const FRACTION = /^(-?\d+)\/(\d+)$/

export function Fraction({ n, d }) {
  return (
    <span className="frac" role="img" aria-label={`${n} over ${d}`}>
      <span className="frac-n">{n}</span>
      <span className="frac-d">{d}</span>
    </span>
  )
}

export default function MathExpr({ text, className }) {
  const tokens = String(text).split(/(\s+)/)
  return (
    <span className={className}>
      {tokens.map((tok, i) => {
        const m = FRACTION.exec(tok)
        return m ? <Fraction key={i} n={m[1]} d={m[2]} /> : <span key={i}>{tok}</span>
      })}
    </span>
  )
}
