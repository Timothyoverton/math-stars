import { useEffect, useState } from 'react'
import { MIXED_SKILLS, SKILLS_BY_GRADE, getSkill } from '../game/skills.js'
import { Store } from '../game/persist/index.js'

function SkillRow({ skill, prog }) {
  const p = prog?.[skill.id]
  const mastery = p ? Math.round(p.mastery * 100) : 0
  const stars = p?.stars || 0
  return (
    <div className="player" style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>{skill.label}</strong>
        <span className="skill-stars">
          {'★'.repeat(stars)}
          <span style={{ color: 'var(--line)' }}>{'★'.repeat(3 - stars)}</span>
        </span>
      </div>
      <div className="bar" style={{ margin: '8px 0 4px' }}>
        <span style={{ width: `${mastery}%` }} />
      </div>
      <span className="muted">
        {p ? `${mastery}% mastery · ${p.correct}/${p.attempts} right · best ⭐${p.best}` : 'Not started'}
      </span>
    </div>
  )
}

export default function Progress({ onBack }) {
  const [progress, setProgress] = useState(null)
  const [history, setHistory] = useState([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    Store.getProgress().then(setProgress)
    Store.getHistory({ limit: 10 }).then(setHistory)
    Store.getStars().then(setTotal)
  }, [])

  const grades = Object.keys(SKILLS_BY_GRADE)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="panel">
      <h1>Your progress</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {total} star{total === 1 ? '' : 's'} across all skills
      </p>

      {grades.map((grade) => (
        <div key={grade}>
          <p className="grade-head">Grade {grade}</p>
          <div className="stack">
            {SKILLS_BY_GRADE[grade].map((s) => (
              <SkillRow key={s.id} skill={s} prog={progress} />
            ))}
          </div>
        </div>
      ))}

      <p className="grade-head">Mixed review</p>
      <div className="stack">
        {MIXED_SKILLS.map((s) => (
          <SkillRow key={s.id} skill={s} prog={progress} />
        ))}
      </div>

      {history.length > 0 && (
        <>
          <h3 style={{ margin: '20px 0 8px' }}>Recent sets</h3>
          <div className="stack">
            {history.map((h, i) => (
              <div key={i} className="muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {getSkill(h.skillId)?.label || h.skillId} {h.mode === 'race' ? '· 🏁' : ''}
                </span>
                <span>
                  {h.correct}/{h.total} · ⭐{h.score}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="btn ghost" style={{ marginTop: 18 }} onClick={onBack}>
        Back
      </button>
    </div>
  )
}
