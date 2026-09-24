import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Scene from './scene/Scene'
import Loader from './ui/Loader'
import Hud from './ui/Hud'
import Cursor from './ui/Cursor'
import LaptopView from './ui/LaptopView'
import PhoneView from './ui/PhoneView'
import ResumeView from './ui/ResumeView'
import ClockView from './ui/ClockView'
import PlantView from './ui/PlantView'
import { useStore } from './store'

export default function App() {
  const focus = useStore((s) => s.focus)
  const hovered = useStore((s) => s.hovered)
  const setFocus = useStore((s) => s.setFocus)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setFocus(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setFocus])

  return (
    <div className={`app ${focus ? 'is-focused' : ''} ${hovered ? 'is-hovering' : ''}`}>
      <Canvas
        className="canvas"
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 32, near: 0.02, far: 30, position: [3.4, 2.4, 4.2] }}
        gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      <Hud />
      <LaptopView open={focus === 'laptop'} />
      <PhoneView open={focus === 'phone'} />
      <ResumeView open={focus === 'resume'} />
      <ClockView open={focus === 'clock'} />
      <PlantView open={focus === 'plant'} />
      <Loader />
      <Cursor />
    </div>
  )
}
