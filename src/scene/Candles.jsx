import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { useIntroClock } from './useIntroClock'

const WARM = new THREE.Color('#ff9442')

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  rg.addColorStop(0, 'rgba(255,190,120,0.9)')
  rg.addColorStop(0.25, 'rgba(255,140,60,0.35)')
  rg.addColorStop(1, 'rgba(255,120,40,0)')
  g.fillStyle = rg
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Candle({ x, z, r, h, delay, glow }) {
  const flame = useRef()
  const halo = useRef()
  const intro = useIntroClock()
  const seed = useMemo(() => Math.random() * 100, [])
  useFrame((state) => {
    const t = state.clock.elapsedTime + seed
    const lit = THREE.MathUtils.clamp((intro.current - delay) * 3, 0, 1)
    const f = 0.85 + Math.sin(t * 11) * 0.06 + Math.sin(t * 23.7) * 0.04 + (Math.random() - 0.5) * 0.05
    flame.current.scale.set(lit * f, lit * (0.9 + f * 0.25), lit * f)
    flame.current.rotation.z = Math.sin(t * 2.3) * 0.08
    flame.current.rotation.x = Math.sin(t * 1.7) * 0.06
    halo.current.material.opacity = lit * (0.55 + f * 0.25)
  })
  return (
    <group position={[x, 0, z]}>
      {/* wax */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 40]} />
        <meshPhysicalMaterial color="#efe6d6" roughness={0.55} transmission={0.15} thickness={0.02} sheen={0.4} />
      </mesh>
      {/* melted rim */}
      <mesh position={[0, h + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.85, 32]} />
        <meshStandardMaterial color="#f3dcb8" emissive="#ff9a4a" emissiveIntensity={0.35} roughness={0.3} />
      </mesh>
      {/* wick */}
      <mesh position={[0, h + 0.006, 0]}>
        <cylinderGeometry args={[0.0008, 0.0008, 0.012, 6]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      {/* flame */}
      <group ref={flame} position={[0, h + 0.012, 0]}>
        <mesh position={[0, 0.009, 0]} scale={[0.0055, 0.016, 0.0055]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={[6, 2.6, 0.8]} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.005, 0]} scale={[0.0028, 0.007, 0.0028]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color={[9, 7, 5]} toneMapped={false} />
        </mesh>
      </group>
      <Billboard position={[0, h + 0.02, 0]}>
        <mesh ref={halo}>
          <planeGeometry args={[0.09, 0.09]} />
          <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  )
}

export default function Candles(props) {
  const light = useRef()
  const glow = useMemo(glowTexture, [])
  const intro = useIntroClock()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const lit = THREE.MathUtils.clamp((intro.current - 1.4) * 1.2, 0, 1)
    const f = 1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 17.3) * 0.06 + (Math.random() - 0.5) * 0.1
    light.current.intensity = lit * 0.55 * f
    light.current.position.x = Math.sin(t * 3.1) * 0.004
  })
  return (
    <group {...props}>
      {/* slate tray */}
      <mesh position={[0, 0.004, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.095, 0.095, 0.008, 48]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.7} />
      </mesh>
      <group position={[0, 0.008, 0]}>
        <Candle x={-0.035} z={0.02} r={0.028} h={0.13} delay={1.4} glow={glow} />
        <Candle x={0.032} z={-0.025} r={0.024} h={0.09} delay={1.65} glow={glow} />
        <Candle x={0.03} z={0.045} r={0.02} h={0.06} delay={1.9} glow={glow} />
      </group>
      <pointLight ref={light} position={[0, 0.2, 0]} color={WARM} distance={2.2} decay={2} />
    </group>
  )
}
