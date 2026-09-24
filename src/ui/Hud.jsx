import { useStore } from '../store'
import { PROFILE } from '../data'

const NAV = [
  ['laptop', 'projects'],
  ['phone', 'contact'],
  ['resume', 'résumé'],
  ['book', 'experience'],
  ['clock', 'timeline'],
  ['plant', 'life'],
]

export default function Hud() {
  const focus = useStore((s) => s.focus)
  const introDone = useStore((s) => s.introDone)
  const setFocus = useStore((s) => s.setFocus)
  const setHovered = useStore((s) => s.setHovered)

  return (
    <div className={`hud ${introDone ? 'in' : ''}`}>
      <header className="hud-top">
        <button className="brand" onClick={() => setFocus(null)}>
          <span className="brand-name">{PROFILE.name}</span>
          <span className="brand-role">{PROFILE.role}</span>
        </button>
        <nav className="hud-nav">
          {NAV.map(([id, label]) => (
            <button
              key={id}
              className={focus === id ? 'active' : ''}
              onClick={() => setFocus(focus === id ? null : id)}
              onMouseEnter={() => !focus && setHovered(id)}
              onMouseLeave={() => !focus && setHovered(null)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className={`hint ${focus ? 'hide' : ''}`}>
        <span className="hint-dot" /> hover the desk · click anything
      </div>

      <button className={`back ${focus ? 'show' : ''}`} onClick={() => setFocus(null)}>
        <span>←</span> back to desk <kbd>esc</kbd>
      </button>
    </div>
  )
}
