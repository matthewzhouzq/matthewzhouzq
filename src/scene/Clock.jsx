import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clockFaceTexture } from './textures'
import { useStore } from '../store'
import { NOW, PALETTE } from '../data'

const R = 0.062
const DEPTH = 0.028
// how fast the hands spin while winding: minute-hand revolutions per year of timeline
const REVS_PER_YEAR = 36

export default function Clock() {
  const hour = useRef()
  const minute = useRef()
  const second = useRef()
  const rim = useRef()
  const shown = useRef(NOW)

  useFrame((state, dt) => {
    const { timeT, hovered, focus } = useStore.getState()
    shown.current = THREE.MathUtils.damp(shown.current, timeT, 3.5, dt)
    const d = new Date()
    const realMin = d.getMinutes() + d.getSeconds() / 60 + d.getMilliseconds() / 60000
    const realHour = (d.getHours() % 12) + realMin / 60
    const offsetMin = (shown.current - NOW) * REVS_PER_YEAR * 60
    const mins = realMin + offsetMin
    const hrs = realHour + offsetMin / 60
    minute.current.rotation.z = -(mins / 60) * Math.PI * 2
    hour.current.rotation.z = -(hrs / 12) * Math.PI * 2
    // second hand: sweeps, and whirs while winding
    const winding = Math.abs(timeT - shown.current) > 0.002
    const s = d.getSeconds() + d.getMilliseconds() / 1000
    second.current.rotation.z = winding ? second.current.rotation.z - dt * 30 * Math.sign(timeT - shown.current) : -(s / 60) * Math.PI * 2
    const hot = hovered === 'clock' || focus === 'clock'
    rim.current.emissiveIntensity = THREE.MathUtils.damp(rim.current.emissiveIntensity, hot ? 0.9 : 0, 6, dt)
  })

  const hand = (w, l, col, z) => (
    <mesh position={[0, l / 2 - l * 0.12, z]}>
      <boxGeometry args={[w, l, 0.0012]} />
      <meshStandardMaterial color={col} roughness={0.4} metalness={0.3} />
    </mesh>
  )

  return (
    <group>
      {/* foot */}
      <mesh position={[0, 0.006, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 0.012, 0.04]} />
        <meshStandardMaterial color="#141416" roughness={0.45} metalness={0.4} />
      </mesh>
      <group position={[0, R + 0.01, 0]}>
        {/* body */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[R, R, DEPTH, 64]} />
          <meshStandardMaterial ref={rim} color="#18181b" roughness={0.35} metalness={0.6} emissive={PALETTE.teal} emissiveIntensity={0} />
        </mesh>
        {/* dial */}
        <mesh position={[0, 0, DEPTH / 2 + 0.0004]}>
          <circleGeometry args={[R * 0.9, 64]} />
          <meshStandardMaterial map={clockFaceTexture()} roughness={0.6} />
        </mesh>
        {/* hands */}
        <group ref={hour} position={[0, 0, DEPTH / 2 + 0.002]}>{hand(0.0045, R * 0.55, '#1d1e21', 0)}</group>
        <group ref={minute} position={[0, 0, DEPTH / 2 + 0.0032]}>{hand(0.003, R * 0.8, '#1d1e21', 0)}</group>
        <group ref={second} position={[0, 0, DEPTH / 2 + 0.0044]}>{hand(0.0012, R * 0.86, '#c0654a', 0)}</group>
        <mesh position={[0, 0, DEPTH / 2 + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.002, 16]} />
          <meshStandardMaterial color="#c0654a" />
        </mesh>
        {/* glass */}
        <mesh position={[0, 0, DEPTH / 2 + 0.006]}>
          <circleGeometry args={[R * 0.92, 64]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.08} roughness={0.02} clearcoat={1} depthWrite={false} />
        </mesh>
        {/* crown (the thing you wind) */}
        <mesh position={[R + 0.004, 0.012, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, 0.008, 16]} />
          <meshStandardMaterial color="#8e8a82" metalness={1} roughness={0.25} />
        </mesh>
      </group>
    </group>
  )
}
