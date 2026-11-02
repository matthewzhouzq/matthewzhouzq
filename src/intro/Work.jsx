import { WORK } from '../data'

/** Scene 2: one piece of work at a time, centred inside the dragon's circle. */
export default function Work({ index, shown, onJump }) {
  const item = WORK[index]
  return (
    <div className={`work ${shown ? 'in' : ''}`}>
      <p className="work-eyebrow">what I’m building</p>

      <article className="work-panel" key={item.id}>
        <p className="work-kicker">
          {item.status === 'now' ? <><i className="work-live" />now building</> : item.status}
          <span> · {item.kind}</span>
        </p>
        <h2 className="work-title">{item.title}</h2>
        <p className="work-summary">{item.summary}</p>
        {item.points.length > 0 && (
          <ul className="work-points">{item.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
        )}
        <div className="work-stack">{item.stack.map((t) => <span key={t}>{t}</span>)}</div>
        {item.links.length > 0 && (
          <div className="work-links">
            {item.links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
          </div>
        )}
      </article>

      <ol className="work-index">
        {WORK.map((w, i) => (
          <li key={w.id} className={i === index ? 'on' : ''}>
            <button onClick={() => onJump(i)}><span>{String(i + 1).padStart(2, '0')}</span>{w.title}</button>
          </li>
        ))}
      </ol>
    </div>
  )
}
