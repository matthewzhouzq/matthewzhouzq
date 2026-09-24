import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useStore } from '../store'
import { PROFILE } from '../data'

export default function Loader() {
  const { progress, active } = useProgress()
  const ready = useStore((s) => s.ready)
  const setReady = useStore((s) => s.setReady)
  const [loaded, setLoaded] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setLoaded(true), 300)
      return () => clearTimeout(t)
    }
  }, [active, progress])

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => setGone(true), 1600)
      return () => clearTimeout(t)
    }
  }, [ready])

  if (gone) return null
  return (
    <div className={`loader ${ready ? 'out' : ''}`}>
      <div className="loader-inner">
        <p className="eyebrow">searching for summer 2027 internships</p>
        <h1 className="loader-name">{PROFILE.name.toLowerCase()}</h1>
        <div className="loader-bar"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
        <button className={`enter ${loaded ? 'show' : ''}`} onClick={setReady} disabled={!loaded}>
          workspace
        </button>
      </div>
    </div>
  )
}
