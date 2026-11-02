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
const SPLIT = 0.5 // page 1 below this, page 2 at or above — never in between.
// At SPLIT the dragon is 3/4 of the way off page 1, and page 2 opens with its head already in view.
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

function Stage({ progress, onReveal, onLap, onPage }) {
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
    const exit1 = path1.exitS + 0.75 * body // 3/4 of the body past the right edge
    const in2 = path2.headInS // head already in view on page 2
    const want = p < SPLIT ? 1 : 2
    let mode = d.sHead === null ? want : d.mode
    // going forward we switch the instant the dragon is 3/4 off page 1 (not just when the scroll says so)
    if (want === 1) mode = 1
    else if (d.mode === 1 && d.sHead >= exit1) mode = 2
    if (d.sHead === null) { d.mode = mode; d.sHead = mode === 1 ? -1.5 * s : in2 } // glide in
    else if (mode !== d.mode) { // switch pages: page 1 → 2 picks up with the head showing; 2 → 1 resumes at the exit
      d.mode = mode
      d.sHead = mode === 2 ? in2 : exit1
      if (mode === 1) { d.loop = 0; d.enter = 0 }
    }
    if (mode === 1) {
      d.path = path1
      d.target = want === 2 ? exit1 + 0.3 * body : THREE.MathUtils.lerp(path1.length * 0.085, exit1, clamp01(p / SPLIT))
    } else {
      d.path = path2
      d.enter = clamp01((p - SPLIT) / (ENTER_END - SPLIT))
      // after the swoop, scrolling drives the dragon round the circle: one full lap per project
      // (down → clockwise, up → backwards; it only moves when you scroll)
      d.loop = clamp01((p - WORK_START) / (1 - WORK_START)) * WORK.length * path2.circ
      d.lapStart = path2.leadLen + body + 0.1 * path2.circ // head position when the swoop ends
      d.target = THREE.MathUtils.lerp(in2, d.lapStart, d.enter) + d.loop
    }
    d.lastP = p
  }, [path1, path2, progress])

  const us = useMemo(() => INTRO_SECTIONS.map((sec) => path1.nearestU(sec.rx ?? sec.x, sec.ry ?? sec.y)), [path1])
  const last = useRef('')
  const lastLap = useRef(-1)
  const lastPage = useRef(1)
  const pan = useRef(0)
  useFrame((_, dt) => {
    const p = progress.current
    // which page we're on is binary; the camera just makes one quick timed move between them
    pan.current = THREE.MathUtils.damp(pan.current, drive.mode === 2 ? 1 : 0, 7, Math.min(dt, 0.05))
    if (drive.mode !== lastPage.current) { lastPage.current = drive.mode; onPage(drive.mode) }
    const e = pan.current
    camera.position.set(THREE.MathUtils.lerp(0, X2, e), 0, THREE.MathUtils.lerp(CAM_Z1, CAM_Z2, e))
    if (drive.sHead === null) return
    if (drive.mode === 2 && drive.lapStart != null) {
      const lap = Math.min(WORK.length - 1, Math.max(0, Math.floor((drive.sHead - drive.lapStart) / path2.circ)))
      if (lap !== lastLap.current) { lastLap.current = lap; onLap(lap) }
    }
    const hu = drive.mode === 1 ? drive.sHead / path1.length : 9
    const key = us.map((u) => (hu > u + 0.015 ? 1 : 0)).join('')
    if (key !== last.current) { last.current = key; onReveal(key.split('').map((c) => c === '1')) }
  })

  return (
    <>
      <color attach="background" args={['#192231']} />
      <Backdrop />
      <ambientLight intensity={0.22} />
      <directionalLight position={[-16, 18, 20]} intensity={4.2} color="#fff1ec" />
      <directionalLight position={[10, -6, -18]} intensity={4} color="#985E6D" />
      <directionalLight position={[-14, 4, -10]} intensity={2} color="#98878F" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 8, -4]} scale={[24, 2, 1]} />
        <Lightformer form="circle" intensity={6} position={[-10, 10, 10]} scale={7} color="#fff1ec" />
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
  const [workIndex, setWorkIndex] = useState(0)
  const [page, setPage] = useState(1)

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

  const page2 = page === 2

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
            <Stage progress={progress} onReveal={setRevealed} onLap={setWorkIndex} onPage={setPage} />
            <EffectComposer multisampling={4}>
              <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.62} luminanceSmoothing={0.2} radius={0.72} />
              <Vignette offset={0.3} darkness={0.5} />
            </EffectComposer>
          </Suspense>
        </Canvas>

        <header className="intro-top">
          <button className="intro-name" onClick={() => scrollToP(0)}>{PROFILE.name.toLowerCase()}</button>
          <button className="intro-skip" onClick={() => jumpToWork(0)}>projects ↓</button>
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
