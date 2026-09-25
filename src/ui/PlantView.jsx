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
        {/* interests are on hold for now — restore by mapping INTERESTS here */}
        <div className="leaf-card soon" style={{ '--i': 0 }}>
          <p>soon...</p>
        </div>
      </div>
    </div>
  )
}
