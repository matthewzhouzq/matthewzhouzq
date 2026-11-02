import { Suspense, useMemo, useRef, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useProgress } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import Dragon from './Dragon'
import { LineTrail, RingTrail } from './Trail'
import Sections from './Sections'
import Work from './Work'
import { makeWorldPath, makeCirclePath } from './path'
import { INTRO_SECTIONS, PROFILE, WORK } from '../data'
import './intro.css'

// palette: Stormy #494E6B · Cloud #98878F · Sunset #985E6D · Evening #192231
const FOV = 30
const CAM_Z1 = 40 // scene 1 camera distance
const CAM_Z2 = 24 // scene 2: pan right + zoom in, so the dragon reads larger
// scroll timeline (0 → 1 over the whole page)
const P1_END = 0.47 // dragon has left scene 1
const SPLIT = 0.5 // page 1 below this, page 2 at or above — never in between
const ENTER_END = 0.6 // dragon has swooped in and joined the circle
const WORK_START = 0.6

const clamp01 = (v) => Math.min(1, Math.max(0, v))

function Backdrop() {
  const mesh = useRef()
  const mat = useMemo(() => new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: { cStorm: { value: new THREE.Color('#494E6B') }, cEve: { value: new THREE.Color('#192231') }, cSun: { value: new THREE.Color('#985E6D') }, cCloud: { value: new THREE.Color('#98878F') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 cStorm, cEve, cSun, cCloud; varying vec2 vUv;
      void main(){
        float r = length((vUv - vec2(0.55, 0.62)) * vec2(1.3, 1.0));
        vec3 col = mix(cStorm * 0.6, cEve, smoothstep(0.05, 0.85, r));          // stormy haze up high
        col += cSun * 0.22 * pow(1.0 - vUv.y, 3.0);                               // dusk glow low on the horizon
        col += cCloud * 0.05 * smoothstep(0.6, 0.0, abs(vUv.y - 0.35));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }), [])
  useFrame(({ camera, size }) => {
    const d = camera.position.z + 30
    const h = 2 * d * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * 1.1
    mesh.current.position.set(camera.position.x, camera.position.y, -30)
    mesh.current.scale.set(h * (size.width / size.height), h, 1)
  })
  return <mesh ref={mesh} material={mat} renderOrder={-1}><planeGeometry /></mesh>
}

function Stage({ progress, onReveal }) {
  const { size, camera } = useThree()
  const H = 2 * CAM_Z1 * Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  const W = H * (size.width / size.height)
  const path1 = useMemo(() => makeWorldPath(W, H), [W, H])
  // scene 2 sits to the right of scene 1, viewed closer
  const X2 = W * 1.15, W2 = W * (CAM_Z2 / CAM_Z1), H2 = H * (CAM_Z2 / CAM_Z1)
  const path2 = useMemo(() => {
    const r = 0.36 * Math.min(H2, W2 * 0.8)
    return makeCirclePath(X2 + 0.03 * W2, -0.02 * H2, r, X2 - W2 / 2)
  }, [X2, W2, H2])
  // dragon spans ~45% of the screen width in scene 1 (it is ~14.6 m long at scale 1)
  const scale = THREE.MathUtils.clamp((W * 0.45) / 14.6, 0.4, 1.6)
  const drive = useMemo(() => ({ sHead: null, mode: 1, path: null, target: 0, loop: 0, wavePhase: 0, bodyLen: 14.6, scale }), [])
  drive.scale = scale

  // called by the dragon every frame: pick the path and where the head should be
  const plan = useCallback((d, dt) => {
    const p = progress.current
    const s = d.scale, body = d.bodyLen
    const mode = p < SPLIT ? 1 : 2
    if (d.sHead === null) { d.mode = mode; d.sHead = mode === 1 ? -1.5 * s : -body - 1.5 * s } // glide in from off-screen
    else if (mode !== d.mode) { // swap scenes while the dragon is off-screen in both
      d.mode = mode
      d.sHead = mode === 2 ? -body - 1.5 * s : path1.length + body + 2 * s
      if (mode === 1) { d.loop = 0; d.enter = 0 }
    }
    if (mode === 1) {
      d.path = path1
      d.target = THREE.MathUtils.lerp(path1.length * 0.085, path1.length + body + 2 * s, clamp01(p / P1_END))
    } else {
      d.path = path2
      // entrance only ever progresses forward (scrolling back up a bit won't reverse it)
      d.enter = Math.max(d.enter || 0, clamp01((p - SPLIT) / (ENTER_END - SPLIT)))
      if (d.enter >= 1) {
        // speed comes from how fast you scroll — either direction — always clockwise; slow drift when idle
        const scrolled = Math.min(0.02, Math.abs(p - (d.lastP ?? p)))
        d.loop += dt * (path2.circ / 22) + scrolled * path2.circ * 7
      }
      d.target = THREE.MathUtils.lerp(-body - 1.5 * s, path2.leadLen + 0.2 * path2.circ, d.enter) + d.loop
    }
    d.lastP = p
  }, [path1, path2, progress])

  const us = useMemo(() => INTRO_SECTIONS.map((sec) => path1.nearestU(sec.rx ?? sec.x, sec.ry ?? sec.y)), [path1])
  const last = useRef('')
  const pan = useRef(progress.current >= SPLIT ? 1 : 0)
  useFrame((_, dt) => {
    const p = progress.current
    // which page we're on is binary; the camera just makes one quick timed move between them
    pan.current = THREE.MathUtils.damp(pan.current, p >= SPLIT ? 1 : 0, 7, Math.min(dt, 0.05))
    const e = pan.current
    camera.position.set(THREE.MathUtils.lerp(0, X2, e), 0, THREE.MathUtils.lerp(CAM_Z1, CAM_Z2, e))
    if (drive.sHead === null) return
    const hu = drive.mode === 1 ? drive.sHead / path1.length : 9
    const key = us.map((u) => (hu > u + 0.015 ? 1 : 0)).join('')
    if (key !== last.current) { last.current = key; onReveal(key.split('').map((c) => c === '1')) }
  })

  return (
    <>
      <color attach="background" args={['#192231']} />
      <Backdrop />
      <ambientLight intensity={0.22} />
      <directionalLight position={[-12, 14, 20]} intensity={2.0} color="#f1e9ea" />
      <directionalLight position={[10, -6, -18]} intensity={4} color="#985E6D" />
      <directionalLight position={[-14, 4, -10]} intensity={2} color="#98878F" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 8, -4]} scale={[24, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-10, 2, 6]} scale={[4, 12, 1]} color="#98878F" />
        <Lightformer form="rect" intensity={1.2} position={[10, -3, 6]} scale={[6, 6, 1]} color="#985E6D" />
      </Environment>
      <LineTrail path={path1} drive={drive} />
      <RingTrail path={path2} drive={drive} />
      <Dragon drive={drive} plan={plan} />
    </>
  )
}

function LoadVeil() {
  const { active, progress } = useProgress()
  return <div className={`intro-veil ${!active && progress >= 100 ? 'gone' : ''}`}><span>{Math.round(progress)}%</span></div>
}

export default function DragonIntro() {
  const scroller = useRef()
  const progress = useRef(0)
  const [p, setP] = useState(0)
  const [revealed, setRevealed] = useState(() => INTRO_SECTIONS.map(() => false))

  const onScroll = useCallback((e) => {
    const el = e.currentTarget
    const v = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
    progress.current = v
    setP(Math.round(v * 400) / 400)
  }, [])

  const scrollToP = useCallback((target) => {
    const el = scroller.current
    el.scrollTo({ top: target * (el.scrollHeight - el.clientHeight), behavior: 'smooth' })
  }, [])
  const jumpToWork = useCallback((i = 0) => scrollToP(WORK_START + ((i + 0.5) / WORK.length) * (1 - WORK_START)), [scrollToP])

  const page2 = p >= SPLIT
  const workIndex = Math.min(WORK.length - 1, Math.max(0, Math.floor(((p - WORK_START) / (1 - WORK_START)) * WORK.length)))

  return (
    <div className="intro" ref={scroller} onScroll={onScroll}>
      <div className="intro-stage">
        <Canvas
          className="intro-canvas"
          dpr={[1, 1.75]}
          camera={{ fov: FOV, near: 1, far: 200, position: [0, 0, CAM_Z1] }}
          gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
        >
          <Suspense fallback={null}>
            <Stage progress={progress} onReveal={setRevealed} />
            <EffectComposer multisampling={4}>
              <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.62} luminanceSmoothing={0.2} radius={0.72} />
              <Vignette offset={0.3} darkness={0.5} />
            </EffectComposer>
          </Suspense>
        </Canvas>

        <header className="intro-top">
          <button className="intro-name" onClick={() => scrollToP(0)}>{PROFILE.name.toLowerCase()}</button>
          <button className="intro-skip" onClick={() => jumpToWork(0)}>what I’m building ↓</button>
        </header>

        <div className={`scene1 ${page2 ? 'away' : ''}`}>
          <Sections revealed={revealed} onNav={() => jumpToWork(0)} />
          <div className={`intro-hint ${p > 0.02 ? 'hide' : ''}`}><span>scroll</span><i /></div>
        </div>

        <Work index={workIndex} shown={page2} onJump={jumpToWork} />
        <LoadVeil />
      </div>
      <div className="intro-track" aria-hidden />
    </div>
  )
}
