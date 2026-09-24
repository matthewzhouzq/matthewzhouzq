import { useEffect, useRef, useState } from 'react'
import { PROJECTS } from '../data'
import { useDelayed } from './useDelayed'

export default function LaptopView({ open }) {
  const shown = useDelayed(open, 650)
  const track = useRef()
  const [index, setIndex] = useState(0)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    if (!open) setDetail(null)
  }, [open])

  const go = (i) => {
    const n = Math.max(0, Math.min(PROJECTS.length - 1, i))
    const card = track.current?.children[n]
    if (card) track.current.scrollTo({ left: card.offsetLeft - track.current.offsetLeft - 24, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!shown) return
    const onKey = (e) => {
      if (detail) return
      if (e.key === 'ArrowRight') go(index + 1)
      if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onScroll = () => {
    const el = track.current
    const w = el.children[0]?.offsetWidth || 1
    setIndex(Math.round(el.scrollLeft / (w + 20)))
  }

  // vertical wheel → horizontal scroll
  const onWheel = (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) track.current.scrollLeft += e.deltaY
  }

  const p = detail && PROJECTS.find((x) => x.id === detail)

  return (
    <div className={`view laptop-view ${shown ? 'open' : ''}`}>
      <div className="mac-window">
        <div className="mac-bar">
          <span className="dots"><i /><i /><i /></span>
          <span className="mac-title">~/projects{p ? `/${p.id}` : ''}</span>
          <span className="mac-count">{String(index + 1).padStart(2, '0')} / {String(PROJECTS.length).padStart(2, '0')}</span>
        </div>

        {!p && (
          <>
            <div className="mac-head">
              <h2>Things I've built</h2>
              <p>scroll, swipe, or use ← → · click a card to open it</p>
            </div>
            <div className="h-track" ref={track} onScroll={onScroll} onWheel={onWheel}>
              {PROJECTS.map((pr, i) => (
                <button
                  key={pr.id}
                  className={`p-card ${i === index ? 'current' : ''}`}
                  style={{ '--accent': pr.accent, '--i': i }}
                  onClick={() => setDetail(pr.id)}
                >
                  <div className="p-cover">
                    <span className="p-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="p-cover-title">{pr.title}</span>
                  </div>
                  <div className="p-body">
                    <div className="p-meta">{pr.year}</div>
                    <h3>{pr.title}</h3>
                    <p>{pr.tagline}</p>
                    <div className="tags">{pr.stack.map((s) => <span key={s}>{s}</span>)}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="h-controls">
              <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="previous">←</button>
              <div className="h-dots">
                {PROJECTS.map((_, i) => <i key={i} className={i === index ? 'on' : ''} onClick={() => go(i)} />)}
              </div>
              <button onClick={() => go(index + 1)} disabled={index === PROJECTS.length - 1} aria-label="next">→</button>
            </div>
          </>
        )}

        {p && (
          <div className="p-detail" style={{ '--accent': p.accent }}>
            <button className="p-back" onClick={() => setDetail(null)}>← all projects</button>
            <div className="p-detail-cover"><span>{p.title}</span></div>
            <div className="p-detail-body">
              <div className="p-meta">{p.year}</div>
              <h2>{p.title}</h2>
              <p className="lead">{p.tagline}</p>
              <div className="tags">{p.stack.map((s) => <span key={s}>{s}</span>)}</div>
              <p className="muted">
                Template write-up: the problem, what you built, the hardest technical decision, and what you'd do
                differently. Add screenshots or a short clip here.
              </p>
              <a className="btn" href={p.link} target="_blank" rel="noreferrer">view project ↗</a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
