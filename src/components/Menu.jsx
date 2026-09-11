import { useEffect, useMemo, useState } from 'react'
import { SKILLS, SKILLS_BY_GRADE, MIXED_SKILLS } from '../game/skills.js'
import { BOT_LEVELS } from '../game/bot.js'
import { Store } from '../game/persist/index.js'
import { session } from '../game/session.js'
import { startPractice, startWarmup } from '../game/store.js'
import { hostRace, playBot } from '../game/mp.js'
import { primeAudio } from '../game/celebrate.js'

const AVATARS = ['🦊', '🐼', '🐸', '🦉', '🐙', '🦄', '🐝', '🐬']

function SkillButton({ skill, sub, stars, selected, onSelect }) {
  return (
    <button
      className={'skill' + (selected ? ' selected' : '')}
      onClick={() => onSelect(skill.id)}
    >
      {skill.label}
      <small>
        {sub}
        {stars > 0 && <span className="skill-stars"> · {'★'.repeat(stars)}</span>}
      </small>
    </button>
  )
}

export default function Menu({ onOpenProgress, onOpenCollection }) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🦊')
  const [skillId, setSkillId] = useState(SKILLS[0].id)
  const [progress, setProgress] = useState({})
  const [totalStars, setTotalStars] = useState(0)
  const [totalGems, setTotalGems] = useState(0)

  // grades sorted ascending — the picker used to lay out every one at once,
  // which made for a very long scroll; only the first is open by default,
  // rest are collapsed behind a tap.
  const grades = useMemo(
    () => Object.keys(SKILLS_BY_GRADE).map(Number).sort((a, b) => a - b),
    [],
  )
  const [openGrades, setOpenGrades] = useState(() => new Set(grades.slice(0, 1)))

  function toggleGrade(grade) {
    setOpenGrades((prev) => {
      const next = new Set(prev)
      if (next.has(grade)) next.delete(grade)
      else next.add(grade)
      return next
    })
  }

  useEffect(() => {
    Store.getProfile().then((p) => {
      if (p) {
        setName(p.name || '')
        setAvatar(p.avatar || '🦊')
      }
    })
    refreshProgress()
  }, [])

  function refreshProgress() {
    Store.getProgress().then(setProgress)
    Store.getStars().then(setTotalStars)
    Store.getGemCount().then(setTotalGems)
  }

  async function persistProfile(patch) {
    const next = await Store.setProfile(patch)
    session.profile = next
  }

  function onName(v) {
    const clean = v.slice(0, 16)
    setName(clean)
    persistProfile({ name: clean.trim() })
  }

  function onAvatar(a) {
    setAvatar(a)
    persistProfile({ avatar: a })
  }

  return (
    <div className="panel">
      <h1>Hi{name ? `, ${name}` : ''}! Ready to practise?</h1>
      <p className="muted">
        {totalStars} star{totalStars === 1 ? '' : 's'} ·{' '}
        <button className="link" onClick={onOpenProgress}>
          see progress
        </button>{' '}
        · 💎 {totalGems} gem{totalGems === 1 ? '' : 's'} ·{' '}
        <button className="link" onClick={onOpenCollection}>
          see collection
        </button>
      </p>

      <label>Your name</label>
      <input
        className="field"
        placeholder="Type your name"
        value={name}
        maxLength={16}
        onChange={(e) => onName(e.target.value)}
      />

      <label>Pick an avatar</label>
      <div className="avatars">
        {AVATARS.map((a) => (
          <button
            key={a}
            className={'avatar' + (a === avatar ? ' selected' : '')}
            onClick={() => onAvatar(a)}
          >
            {a}
          </button>
        ))}
      </div>

      <label>Choose a skill</label>
      {grades.map((grade) => {
        const open = openGrades.has(grade)
        return (
          <div key={grade}>
            <button
              type="button"
              className="grade-head grade-toggle"
              aria-expanded={open}
              onClick={() => toggleGrade(grade)}
            >
              Grade {grade}
              <span className="grade-chevron">{open ? '▾' : '▸'}</span>
            </button>
            {open && (
              <div className="skills">
                {SKILLS_BY_GRADE[grade].map((s) => (
                  <SkillButton
                    key={s.id}
                    skill={s}
                    sub={s.strand}
                    stars={progress[s.id]?.stars || 0}
                    selected={s.id === skillId}
                    onSelect={setSkillId}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      <p className="grade-head">Mixed review</p>
      <div className="skills">
        {MIXED_SKILLS.map((s) => (
          <SkillButton
            key={s.id}
            skill={s}
            sub="a bit of everything"
            stars={progress[s.id]?.stars || 0}
            selected={s.id === skillId}
            onSelect={setSkillId}
          />
        ))}
      </div>

      <div className="stack" style={{ marginTop: 18 }}>
        <button
          className="btn big"
          onClick={() => {
            // Priming here, synchronously inside the click, is what actually
            // unlocks Web Audio — a useEffect on the result screen later is
            // too late in Safari. See celebrate.js.
            primeAudio()
            if (progress[skillId]) startPractice(skillId)
            else startWarmup(skillId)
          }}
        >
          Practise 20 questions
        </button>
        <button
          className="btn secondary"
          onClick={() => {
            primeAudio()
            hostRace(skillId)
          }}
        >
          🏁 Race a friend
        </button>
      </div>

      <p className="grade-head" style={{ marginTop: 18 }}>
        Or play the robot 🤖
      </p>
      <div className="row">
        {BOT_LEVELS.map((l) => (
          <button
            key={l.id}
            className="btn secondary"
            onClick={() => {
              primeAudio()
              playBot(skillId, l.id)
            }}
          >
            {l.avatar} {l.label.replace(' robot', '')}
          </button>
        ))}
      </div>
    </div>
  )
}
