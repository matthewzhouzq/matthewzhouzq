import { INTERESTS } from '../data'
import { useDelayed } from './useDelayed'

export default function PlantView({ open }) {
  const shown = useDelayed(open, 600)
  return (
    <div className={`view plant-view ${shown ? 'open' : ''}`}>
      <div className="plant-head">
        <p className="eyebrow">off the clock</p>
        <h2>What grows<br />outside work.</h2>
      </div>
      <div className="leaf-cards">
        {INTERESTS.map((it, i) => (
          <div className="leaf-card" key={it.title} style={{ '--i': i }}>
            <span className="leaf-glyph">{it.glyph}</span>
            <div>
              <h3>{it.title}</h3>
              <p>{it.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
