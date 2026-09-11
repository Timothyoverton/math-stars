import { useEffect, useState } from 'react'
import { SKILLS, SKILLS_BY_GRADE, MIXED_SKILLS } from '../game/skills.js'
import { Store } from '../game/persist/index.js'
import { session } from '../game/session.js'
import { startPractice } from '../game/store.js'
import { hostRace } from '../game/mp.js'

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

export default function Menu({ onOpenProgress }) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🦊')
  const [skillId, setSkillId] = useState(SKILLS[0].id)
  const [progress, setProgress] = useState({})
  const [totalStars, setTotalStars] = useState(0)

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
        {totalStars} star{totalStars === 1 ? '' : 's'} earned ·{' '}
        <button className="link" onClick={onOpenProgress}>
          see progress
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
      {Object.keys(SKILLS_BY_GRADE)
        .map(Number)
        .sort((a, b) => a - b)
        .map((grade) => (
          <div key={grade}>
            <p className="grade-head">Grade {grade}</p>
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
          </div>
        ))}

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
        <button className="btn big" onClick={() => startPractice(skillId)}>
          Practise 20 questions
        </button>
        <button className="btn secondary" onClick={() => hostRace(skillId)}>
          🏁 Race a friend
        </button>
      </div>
    </div>
  )
}
