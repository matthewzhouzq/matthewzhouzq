import { useEffect, useRef, useState } from 'react'
import { PROJECTS } from '../data'
import { useDelayed } from './useDelayed'

const GitHubIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

export default function LaptopView({ open }) {
  const shown = useDelayed(open, 650)
  const track = useRef()
  const [index, setIndex] = useState(0)
  const wheelLock = useRef(0)

  const go = (i) => {
    const n = Math.max(0, Math.min(PROJECTS.length - 1, i))
    track.current?.scrollTo({ left: n * track.current.clientWidth, behavior: 'smooth' })
    setIndex(n)
  }

  useEffect(() => {
    if (!shown) return
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(index + 1)
      if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onScroll = () => {
    const el = track.current
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  // a mouse-wheel notch flips exactly one slide
  const onWheel = (e) => {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
    const now = performance.now()
    if (now - wheelLock.current < 650 || Math.abs(e.deltaY) < 8) return
    wheelLock.current = now
    go(index + Math.sign(e.deltaY))
  }

  return (
    <div className={`view laptop-view ${shown ? 'open' : ''}`}>
      <div className="mac-window">
        <div className="mac-bar">
          <span className="dots"><i /><i /><i /></span>
          <span className="mac-title">~/projects/{PROJECTS[index]?.id}</span>
          <span className="mac-count">{String(index + 1).padStart(2, '0')} / {String(PROJECTS.length).padStart(2, '0')}</span>
        </div>

        <div className="slides" ref={track} onScroll={onScroll} onWheel={onWheel}>
          {PROJECTS.map((p, i) => (
            <article key={p.id} className={`slide ${i === index ? 'current' : ''}`} style={{ '--accent': p.accent }}>
              <div className="slide-cover">
                <span className="p-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="slide-cover-title">{p.title}</span>
              </div>
              <div className="slide-body">
                <div className="p-meta">{p.year}</div>
                <h2>{p.title}</h2>
                <p className="lead">{p.tagline}</p>
                <div className="tags">{p.stack.map((s) => <span key={s}>{s}</span>)}</div>
                <div className="slide-actions">
                  <a className="btn" href={p.link} target="_blank" rel="noreferrer">view project ↗</a>
                  <a className="btn ghost" href={p.github} target="_blank" rel="noreferrer"><GitHubIcon /> github</a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="h-controls">
          <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="previous project">←</button>
          <div className="h-dots">
            {PROJECTS.map((p, i) => (
              <i key={p.id} className={i === index ? 'on' : ''} onClick={() => go(i)} title={p.title} />
            ))}
          </div>
          <button onClick={() => go(index + 1)} disabled={index === PROJECTS.length - 1} aria-label="next project">→</button>
        </div>
      </div>
    </div>
  )
}
