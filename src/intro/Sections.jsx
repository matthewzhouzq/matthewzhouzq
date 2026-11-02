import { useState } from 'react'
import { CHAPTERS, PROJECTS, CONTACTS, PROFILE, INTRO_SECTIONS } from '../data'

const base = import.meta.env.BASE_URL

function List({ kind }) {
  if (kind === 'chapters')
    return (
      <ul className="leaf-list">
        {[...CHAPTERS].reverse().map((c) => (
          <li key={c.id}><b>{c.org}</b><span>{c.role}</span><em>{c.when}</em></li>
        ))}
      </ul>
    )
  if (kind === 'projects')
    return (
      <ul className="leaf-list">
        {PROJECTS.map((p) => (
          <li key={p.id}>
            <b><a href={p.github} target="_blank" rel="noreferrer">{p.title} ↗</a></b>
            <span>{p.tagline}</span><em>{p.year}</em>
          </li>
        ))}
      </ul>
    )
  if (kind === 'contacts')
    return (
      <ul className="leaf-list">
        {CONTACTS.map((c) => (
          <li key={c.id}><b>{c.label}</b><span><a href={c.href} target="_blank" rel="noreferrer">{c.value}</a></span></li>
        ))}
      </ul>
    )
  return null
}

function Leaf({ s, i, shown, onNav }) {
  const [open, setOpen] = useState(false)
  const style = {
    [s.align === 'right' ? 'right' : 'left']: s.align === 'right' ? `${(1 - s.x) * 100}%` : `${s.x * 100}%`,
    top: `${s.y * 100}%`,
    '--room': `calc(${(1 - s.y) * 100}vh - 120px)`, // space left below the block before the screen edge
  }
  return (
    <section className={`leaf ${shown ? 'shown' : ''} ${open ? 'open' : ''} align-${s.align}`} style={style}>
      <button className="leaf-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="leaf-kicker"><i className="leaf-dot" />{String(i + 1).padStart(2, '0')} · {s.kicker}</span>
        <span className="leaf-title">{s.title}</span>
        <span className="leaf-sub">{s.sub}</span>
        <span className="leaf-more">{open ? '— less' : '+ more'}</span>
      </button>
      <div className="leaf-body">
        <div className="leaf-inner">
          {s.body && <p>{s.body}</p>}
          {s.list && <List kind={s.list} />}
          <div className="leaf-links">
            {s.links?.map((l) =>
              l.to ? (
                <button key={l.label} onClick={() => onNav(l.to)}>{l.label} →</button>
              ) : (
                <a key={l.label} href={l.href.startsWith('http') || l.href.startsWith('mailto') ? l.href : base + l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Sections({ revealed, onNav }) {
  return (
    <div className="leaves">
      {INTRO_SECTIONS.map((s, i) => (
        <Leaf key={s.id} s={s} i={i} shown={revealed[i]} onNav={onNav} />
      ))}
      <span className="sr-only">{PROFILE.name}</span>
    </div>
  )
}
