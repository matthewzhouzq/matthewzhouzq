import { Suspense, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, Outline, Selection, ToneMapping, N8AO, SMAA } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'

import Room from './Room'
import Desk from './Desk'
import Chair from './Chair'
import Lamp from './Lamp'
import Candles from './Candles'
import Laptop from './Laptop'
import Phone from './Phone'
import Resume from './Resume'
import Clock from './Clock'
import Plant from './Plant'
import Interactive from './Interactive'
import CameraRig from './CameraRig'
import { useIntroClock } from './useIntroClock'
import { LAYOUT, useStore } from '../store'

const at = (k) => ({ position: LAYOUT[k].pos, rotation: [0, LAYOUT[k].rot, 0] })

function Lights() {
  const moon = useRef()
  const wash = useRef()
  const amb = useRef()
  const intro = useIntroClock()
  useFrame(() => {
    const k = THREE.MathUtils.smoothstep(intro.current, 0, 2.2)
    moon.current.intensity = 0.45 * k
    wash.current.intensity = 14 * k
    amb.current.intensity = 0.14 * k
  })
  return (
    <>
      <hemisphereLight ref={amb} color="#a3a8b3" groundColor="#1c1a18" />
      {/* cold moonlight from the window on the left wall */}
      <directionalLight
        ref={moon}
        position={[-4, 3.2, 0.9]}
        color="#8fa2c9"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-2.5}
        shadow-camera-right={2.5}
        shadow-camera-top={2.5}
        shadow-camera-bottom={-2.5}
        shadow-bias={-0.0005}
      />
      {/* soft teal wash on the wall behind the desk — the palette's accent */}
      <spotLight
        ref={wash}
        position={[0, 3.2, -0.55]}
        target-position={[0, 1.2, -1.25]}
        color="#3a6f62"
        angle={1}
        penumbra={1}
        distance={6}
        decay={2}
      />
    </>
  )
}

function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.25} distanceFalloff={0.6} intensity={2.4} quality="medium" halfRes color="#000000" />
      <Outline visibleEdgeColor={0xbfe3d6} hiddenEdgeColor={0x336356} edgeStrength={4} blur pulseSpeed={0.35} width={900} />
      <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.9} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.25} darkness={0.8} />
      <Noise opacity={0.035} premultiply />
      <SMAA />
    </EffectComposer>
  )
}

function Dust() {
  // motes drifting through the lamp beam
  return <Sparkles count={45} scale={[0.45, 0.38, 0.3]} position={[-0.45, 0.98, -0.25]} size={0.22} speed={0.12} opacity={0.3} color="#dfe8ff" />
}

export default function Scene() {
  const clearHover = useStore((s) => s.setHovered)
  return (
    <>
      <color attach="background" args={['#050506']} />
      <fog attach="fog" args={['#050506', 5, 14]} />
      <CameraRig />
      <Lights />
      <Environment resolution={128} environmentIntensity={0.16}>
        <Lightformer form="rect" intensity={2} color="#d6e6ff" position={[-0.4, 2, 0]} scale={[2, 0.4, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="circle" intensity={2} color="#ff9442" position={[1, 1, 1]} scale={0.5} />
        <Lightformer form="rect" intensity={1} color="#5a6780" position={[-3, 1.5, 0]} scale={[2, 2, 1]} rotation-y={Math.PI / 2} />
      </Environment>

      <Selection>
        <Effects />
        <group onPointerMissed={() => clearHover(null)}>
          <Room />
          <Desk />
          <Chair position={[-0.3, 0, 0.66]} rotation={[0, Math.PI + 0.4, 0]} />
          <Lamp {...at('lamp')} />
          <Candles {...at('candles')} />

          <Suspense fallback={null}>
            <Interactive id="laptop" label="Projects" sub="the macbook" labelY={0.26} lift={0.006} {...at('laptop')}>
              <Laptop />
            </Interactive>
            <Interactive id="phone" label="Contact" sub="the phone" labelY={0.06} {...at('phone')}>
              <Phone />
            </Interactive>
            <Interactive id="resume" label="Résumé" sub="the paper" labelY={0.06} lift={0.008} {...at('resume')}>
              <Resume />
            </Interactive>
            <Interactive id="clock" label="Timeline" sub="wind the clock" labelY={0.2} {...at('clock')}>
              <Clock />
            </Interactive>
            <Interactive id="plant" label="Off the clock" sub="the plant" labelY={0.28} lift={0.006} {...at('plant')}>
              <Plant />
            </Interactive>
          </Suspense>
          <Dust />
        </group>
      </Selection>
    </>
  )
}
