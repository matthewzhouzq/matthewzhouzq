import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { NOW, TIMELINE, TIME_RANGE } from '../data'
import { useDelayed } from './useDelayed'

const [MIN, MAX] = TIME_RANGE
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const clamp = (v) => Math.max(MIN, Math.min(MAX, v))
const fmt = (t) => `${MONTHS[Math.min(11, Math.floor((t % 1) * 12))]} ${Math.floor(t)}`

export default function ClockView({ open }) {
  const shown = useDelayed(open, 600)
  const timeT = useStore((s) => s.timeT)
  const setTimeT = useStore((s) => s.setTimeT)
  const bar = useRef()
  const drag = useRef(null)

  // leaving the clock rewinds you back to the present
  useEffect(() => {
    if (!open) setTimeT(NOW)
  }, [open, setTimeT])

  // wheel anywhere winds time while the clock is focused
  useEffect(() => {
    if (!open) return
    const onWheel = (e) => setTimeT(clamp(useStore.getState().timeT + e.deltaY * 0.0012))
    const onKey = (e) => {
      if (e.key === 'ArrowRight') jump(1)
      if (e.key === 'ArrowLeft') jump(-1)
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  })

  const jump = (dir) => {
    const t = useStore.getState().timeT
    const next = dir > 0 ? TIMELINE.find((m) => m.t > t + 0.01) : [...TIMELINE].reverse().find((m) => m.t < t - 0.01)
    setTimeT(next ? next.t : dir > 0 ? MAX : MIN)
  }

  const fromX = (clientX) => {
    const r = bar.current.getBoundingClientRect()
    return clamp(MIN + ((clientX - r.left) / r.width) * (MAX - MIN))
  }

  // the milestone you're currently "at"
  const current = [...TIMELINE].reverse().find((m) => m.t <= timeT + 0.02)
  const future = timeT > NOW + 0.02
  const pct = (t) => ((t - MIN) / (MAX - MIN)) * 100

  return (
    <div className={`view clock-view ${shown ? 'open' : ''}`}>
      <div className="clock-card">
        <p className="eyebrow">{future ? 'winding forward' : timeT < NOW - 0.02 ? 'rewinding' : 'the present'}</p>
        <div className="clock-date">{fmt(timeT)}</div>
        <div className="milestone" key={current?.title}>
          {current ? (
            <>
              <h3>{current.title}</h3>
              <p>{current.text}</p>
            </>
          ) : (
            <p className="muted">Before all this. Wind forward →</p>
          )}
        </div>

        <div
          className="scrub"
          ref={bar}
          onPointerDown={(e) => {
            drag.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            setTimeT(fromX(e.clientX))
          }}
          onPointerMove={(e) => drag.current && setTimeT(fromX(e.clientX))}
          onPointerUp={() => (drag.current = false)}
        >
          <div className="scrub-line" />
          <div className="scrub-now" style={{ left: `${pct(NOW)}%` }} title="now" />
          {TIMELINE.map((m) => (
            <button
              key={m.title}
              className={`scrub-tick ${current === m ? 'on' : ''}`}
              style={{ left: `${pct(m.t)}%` }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setTimeT(m.t)}
              title={m.title}
            />
          ))}
          <div className="scrub-knob" style={{ left: `${pct(timeT)}%` }} />
          <div className="scrub-years">
            {Array.from({ length: Math.ceil(MAX) - Math.ceil(MIN) + 1 }, (_, i) => Math.ceil(MIN) + i).map((y) => (
              <span key={y} style={{ left: `${pct(y)}%` }}>{`'${String(y).slice(2)}`}</span>
            ))}
          </div>
        </div>

        <div className="clock-actions">
          <button className="btn ghost" onClick={() => jump(-1)}>⟲ rewind</button>
          <button className="btn ghost" onClick={() => setTimeT(NOW)}>now</button>
          <button className="btn ghost" onClick={() => jump(1)}>wind ⟳</button>
        </div>
        <p className="muted small">scroll · drag · ← → to wind time</p>
      </div>
    </div>
  )
}
