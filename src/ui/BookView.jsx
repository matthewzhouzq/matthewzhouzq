import { useEffect, useState } from 'react'
import { CHAPTERS } from '../data'
import { useDelayed } from './useDelayed'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
const FLIP_MS = 900

// spread 0 = title + contents; spread n = chapter n
function Left({ s, go }) {
  if (s === 0)
    return (
      <div className="pg pg-title">
        <p className="pg-eyebrow">a working history</p>
        <h2>Chapters</h2>
        <p className="pg-muted">Teams, co-ops and clubs — the places I learned how to build things with other people.</p>
      </div>
    )
  const c = CHAPTERS[s - 1]
  return (
    <div className="pg pg-chapter">
      <p className="pg-eyebrow">Chapter {ROMAN[s - 1]}</p>
      <h2>{c.org}</h2>
      <p className="pg-role">{c.role}</p>
      <dl className="pg-meta">
        <div><dt>when</dt><dd>{c.when}</dd></div>
        <div><dt>where</dt><dd>{c.where}</dd></div>
      </dl>
      <span className="pg-folio">{s * 2}</span>
    </div>
  )
}

function Right({ s, go }) {
  if (s === 0)
    return (
      <div className="pg pg-toc">
        <p className="pg-eyebrow">contents</p>
        <ol>
          {CHAPTERS.map((c, i) => (
            <li key={c.id}>
              <button onClick={() => go(i + 1)}>
                <span className="toc-num">{ROMAN[i]}</span>
                <span className="toc-name">{c.short}</span>
                <span className="toc-dots" />
                <span className="toc-page">{(i + 1) * 2}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    )
  const c = CHAPTERS[s - 1]
  return (
    <div className="pg pg-notes">
      <ul>
        {c.points.map((p) => <li key={p}>{p}</li>)}
      </ul>
      <div className="pg-tags">{c.stack.map((t) => <span key={t}>{t}</span>)}</div>
      <span className="pg-folio">{s * 2 + 1}</span>
    </div>
  )
}

export default function BookView({ open }) {
  const shown = useDelayed(open, 1100) // let the cover swing open first
  const total = CHAPTERS.length + 1
  const [spread, setSpread] = useState(0)
  const [flip, setFlip] = useState(null) // { from, to, dir }

  useEffect(() => {
    if (!open) {
      setSpread(0)
      setFlip(null)
    }
  }, [open])

  const go = (to) => {
    if (flip || to === spread || to < 0 || to >= total) return
    setFlip({ from: spread, to, dir: to > spread ? 1 : -1 })
    setTimeout(() => {
      setSpread(to)
      setFlip(null)
    }, FLIP_MS)
  }

  useEffect(() => {
    if (!shown) return
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(spread + 1)
      if (e.key === 'ArrowLeft') go(spread - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // During a flip the static halves show what's revealed underneath
  const leftS = flip ? (flip.dir > 0 ? flip.from : flip.to) : spread
  const rightS = flip ? (flip.dir > 0 ? flip.to : flip.from) : spread

  return (
    <div className={`view book-view ${shown ? 'open' : ''}`}>
      <div className="book">
        <div className="page left" onClick={() => go(spread - 1)}><Left s={leftS} go={go} /></div>
        <div className="page right" onClick={(e) => e.target.closest('button') || go(spread + 1)}><Right s={rightS} go={go} /></div>
        <div className="gutter" />
        {flip && (
          <div className={`leaf ${flip.dir > 0 ? 'fwd' : 'back'}`} style={{ animationDuration: `${FLIP_MS}ms` }}>
            <div className="leaf-face front">
              {flip.dir > 0 ? <Right s={flip.from} go={go} /> : <Left s={flip.from} go={go} />}
            </div>
            <div className="leaf-face back">
              {flip.dir > 0 ? <Left s={flip.to} go={go} /> : <Right s={flip.to} go={go} />}
            </div>
          </div>
        )}
      </div>
      <div className="book-controls">
        <button className="btn ghost" onClick={() => go(spread - 1)} disabled={spread === 0}>← prev</button>
        <span className="book-pos">{spread === 0 ? 'contents' : `chapter ${ROMAN[spread - 1]} of ${ROMAN[CHAPTERS.length - 1]}`}</span>
        <button className="btn ghost" onClick={() => go(spread + 1)} disabled={spread === total - 1}>next →</button>
      </div>
    </div>
  )
}
