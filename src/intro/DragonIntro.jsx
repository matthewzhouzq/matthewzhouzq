import { Suspense, useMemo, useRef, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useProgress } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import Dragon from './Dragon'
import Trail from './Trail'
import Sections from './Sections'
import { makeWorldPath } from './path'
import { INTRO_SECTIONS, PROFILE } from '../data'
import './intro.css'

const BG = '#202227'

function Stage({ progress, onReveal }) {
  const { viewport, camera } = useThree()
  const vp = viewport.getCurrentViewport(camera, [0, 0, 0])
  const path = useMemo(() => makeWorldPath(vp.width, vp.height), [vp.width, vp.height])
  // dragon spans ~30% of the screen width (it's ~14.6 m long at scale 1)
  const scale = THREE.MathUtils.clamp((vp.width * 0.3) / 14.6, 0.28, 1.1)
  const drive = useMemo(() => ({ sHead: null, wavePhase: 0, bodyLen: 14.6, scale }), [])
  drive.scale = scale
  const us = useMemo(() => INTRO_SECTIONS.map((s) => path.nearestU(s.x, s.from === 'bottom' ? s.y - 0.08 : s.y)), [path])
  const last = useRef('')
  useFrame(() => {
    if (drive.sHead === null) return
    const hu = drive.sHead / path.length
    const key = us.map((u) => (hu > u + 0.015 ? 1 : 0)).join('')
    if (key !== last.current) { last.current = key; onReveal(key.split('').map((c) => c === '1')) }
  })
  return (
    <>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-12, 14, 20]} intensity={2.2} />
      <directionalLight position={[10, -6, -18]} intensity={3.5} color="#9fd3ff" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.5} position={[0, 8, -4]} scale={[24, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-10, 2, 6]} scale={[4, 12, 1]} color="#bfe6ff" />
        <Lightformer form="rect" intensity={0.8} position={[10, -3, 6]} scale={[6, 6, 1]} color="#ffd9a8" />
      </Environment>
      <Trail path={path} drive={drive} />
      <Dragon path={path} drive={drive} progress={progress} />
    </>
  )
}

function LoadVeil() {
  const { active, progress } = useProgress()
  return (
    <div className={`intro-veil ${!active && progress >= 100 ? 'gone' : ''}`}>
      <span>{Math.round(progress)}%</span>
    </div>
  )
}

export default function DragonIntro({ onEnter }) {
  const progress = useRef(0)
  const [p, setP] = useState(0)
  const [revealed, setRevealed] = useState(() => INTRO_SECTIONS.map(() => false))
  const [leaving, setLeaving] = useState(false)

  const onScroll = useCallback((e) => {
    const el = e.currentTarget
    const v = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
    progress.current = v
    setP(Math.round(v * 100) / 100)
  }, [])

  const goDesk = useCallback((focus) => {
    setLeaving(true)
    setTimeout(() => onEnter(focus === 'home' ? null : focus), 700)
  }, [onEnter])

  return (
    <div className={`intro ${leaving ? 'leaving' : ''}`} onScroll={onScroll}>
      <div className="intro-stage">
        <Canvas
          className="intro-canvas"
          dpr={[1, 1.75]}
          camera={{ fov: 30, near: 1, far: 200, position: [0, 0, 40] }}
          gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
        >
          <Suspense fallback={null}>
            <Stage progress={progress} onReveal={setRevealed} />
            <EffectComposer multisampling={4}>
              <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.6} luminanceSmoothing={0.2} radius={0.72} />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              <Vignette offset={0.3} darkness={0.45} />
            </EffectComposer>
          </Suspense>
        </Canvas>

        <header className="intro-top">
          <span className="intro-name">{PROFILE.name.toLowerCase()}</span>
          <button className="intro-skip" onClick={() => goDesk('home')}>skip to workspace →</button>
        </header>

        <Sections revealed={revealed} onDesk={goDesk} />

        <div className={`intro-hint ${p > 0.02 ? 'hide' : ''}`}><span>scroll</span><i /></div>
        <button className={`intro-cta ${p > 0.97 ? 'show' : ''}`} onClick={() => goDesk('home')}>enter the workspace</button>
        <LoadVeil />
      </div>
      <div className="intro-track" aria-hidden />
    </div>
  )
}
