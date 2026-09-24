import { useRef, useState } from 'react'
import { CONTACTS, PROFILE } from '../data'
import { useDelayed } from './useDelayed'

export default function PhoneView({ open }) {
  const shown = useDelayed(open, 600)
  const scroller = useRef()
  const [page, setPage] = useState(0)
  const [copied, setCopied] = useState(null)
  const pages = CONTACTS.length + 1

  const onScroll = () => {
    const el = scroller.current
    setPage(Math.round(el.scrollTop / el.clientHeight))
  }
  const go = (i) => scroller.current?.scrollTo({ top: i * scroller.current.clientHeight, behavior: 'smooth' })
  const copy = async (c) => {
    try {
      await navigator.clipboard.writeText(c.value)
      setCopied(c.id)
      setTimeout(() => setCopied(null), 1400)
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className={`view phone-view ${shown ? 'open' : ''}`}>
      <div className="iphone">
        <div className="island" />
        <div className="v-track" ref={scroller} onScroll={onScroll}>
          <section className="v-page v-intro">
            <p className="eyebrow">contact</p>
            <h2>Say hi to<br />{PROFILE.name.split(' ')[0]}.</h2>
            <p className="muted">Swipe up</p>
            <div className="swipe">↑</div>
          </section>
          {CONTACTS.map((c, i) => (
            <section key={c.id} className="v-page" style={{ '--i': i }}>
              <div className="v-glyph">{c.glyph}</div>
              <p className="eyebrow">{c.label}</p>
              <p className="v-value">{c.value}</p>
              <div className="v-actions">
                <a className="btn" href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{c.action}</a>
                <button className="btn ghost" onClick={() => copy(c)}>{copied === c.id ? 'copied ✓' : 'copy'}</button>
              </div>
            </section>
          ))}
        </div>
        <div className="v-dots">
          {Array.from({ length: pages }, (_, i) => <i key={i} className={i === page ? 'on' : ''} onClick={() => go(i)} />)}
        </div>
        <div className="home-bar" />
      </div>
    </div>
  )
}
