import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { alarmDialTexture } from './textures'
import { useStore } from '../store'
import { NOW } from '../data'

// Classic black twin-bell alarm clock. Origin = desk surface under the feet.
const R = 0.058 // case radius
const DEPTH = 0.034
const CY = R + 0.018 // case centre height (sits on two splayed feet)
const REVS_PER_YEAR = 36 // minute-hand revolutions per year while winding

const black = { color: '#070708', roughness: 0.4, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.3 }
const chrome = { color: '#b9b9bc', roughness: 0.22, metalness: 1 }

function handShape(len, w, tail) {
  // tapered hand with a small counterweight tail
  const s = new THREE.Shape()
  s.moveTo(-w * 0.6, -tail)
  s.lineTo(w * 0.6, -tail)
  s.lineTo(w * 0.5, 0)
  s.lineTo(w * 0.28, len * 0.82)
  s.lineTo(0, len)
  s.lineTo(-w * 0.28, len * 0.82)
  s.lineTo(-w * 0.5, 0)
  s.closePath()
  return new THREE.ShapeGeometry(s)
}

function Bell({ side }) {
  return (
    <group position={[side * R * 0.52, R * 0.86, -0.002]} rotation={[0, 0, -side * 0.62]}>
      {/* dome */}
      <mesh castShadow>
        <sphereGeometry args={[R * 0.46, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial {...black} side={THREE.DoubleSide} />
      </mesh>
      {/* rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R * 0.46, 0.0014, 8, 48]} />
        <meshStandardMaterial {...chrome} />
      </mesh>
      {/* finial */}
      <mesh position={[0, R * 0.5, 0]}>
        <cylinderGeometry args={[0.0022, 0.0022, 0.012, 12]} />
        <meshStandardMaterial {...chrome} />
      </mesh>
      <mesh position={[0, R * 0.5 + 0.007, 0]}>
        <cylinderGeometry args={[0.0036, 0.0036, 0.004, 16]} />
        <meshStandardMaterial {...chrome} />
      </mesh>
    </group>
  )
}

export default function Clock() {
  const hour = useRef()
  const minute = useRef()
  const second = useRef()
  const bells = useRef()
  const shown = useRef(NOW)

  const geos = useMemo(
    () => ({ hour: handShape(R * 0.46, 0.0075, 0.008), minute: handShape(R * 0.7, 0.006, 0.009) }),
    []
  )

  useFrame((state, dt) => {
    const { timeT, hovered, focus } = useStore.getState()
    shown.current = THREE.MathUtils.damp(shown.current, timeT, 3.5, dt)
    const d = new Date()
    const realMin = d.getMinutes() + d.getSeconds() / 60
    const realHour = (d.getHours() % 12) + realMin / 60
    const offsetMin = (shown.current - NOW) * REVS_PER_YEAR * 60
    minute.current.rotation.z = -((realMin + offsetMin) / 60) * Math.PI * 2
    hour.current.rotation.z = -((realHour + offsetMin / 60) / 12) * Math.PI * 2

    const delta = timeT - shown.current
    const winding = Math.abs(delta) > 0.002
    const s = d.getSeconds() + d.getMilliseconds() / 1000
    // real clocks tick: step once a second
    second.current.rotation.z = winding
      ? second.current.rotation.z - dt * 30 * Math.sign(delta)
      : -(Math.floor(s) / 60) * Math.PI * 2

    // bells shiver on hover and ring while you wind
    const t = state.clock.elapsedTime
    const hot = hovered === 'clock' && !focus
    const ring = winding ? 0.012 : hot ? 0.006 : 0
    bells.current.position.x = Math.sin(t * 90) * ring * 0.15
    bells.current.rotation.z = Math.sin(t * 70) * ring
  })

  return (
    <group>
      {/* splayed chrome feet */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * R * 0.58, 0.012, 0]} rotation={[0, 0, sd * 0.45]} castShadow>
          <cylinderGeometry args={[0.0035, 0.0055, 0.028, 16]} />
          <meshStandardMaterial {...chrome} />
        </mesh>
      ))}

      <group position={[0, CY, 0]}>
        {/* case */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[R, R, DEPTH, 72]} />
          <meshPhysicalMaterial {...black} />
        </mesh>
        {/* rounded front bezel */}
        <mesh position={[0, 0, DEPTH / 2]}>
          <torusGeometry args={[R * 0.955, R * 0.07, 16, 72]} />
          <meshPhysicalMaterial {...black} />
        </mesh>
        {/* back cover + winding keys */}
        <mesh position={[0, 0, -DEPTH / 2 - 0.001]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R * 0.8, R * 0.8, 0.002, 48]} />
          <meshStandardMaterial {...chrome} roughness={0.35} />
        </mesh>
        {[-0.022, 0.022].map((x) => (
          <mesh key={x} position={[x, -0.01, -DEPTH / 2 - 0.006]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.012, 0.004, 0.003]} />
            <meshStandardMaterial {...chrome} />
          </mesh>
        ))}

        {/* dial */}
        <mesh position={[0, 0, DEPTH / 2 + 0.0005]}>
          <circleGeometry args={[R * 0.9, 72]} />
          <meshStandardMaterial map={alarmDialTexture()} roughness={0.6} emissive="#ffffff" emissiveMap={alarmDialTexture()} emissiveIntensity={0.07} />
        </mesh>

        {/* hands */}
        <group ref={hour} position={[0, 0, DEPTH / 2 + 0.002]}>
          <mesh geometry={geos.hour}><meshStandardMaterial color="#0e0e0f" roughness={0.4} metalness={0.4} /></mesh>
        </group>
        <group ref={minute} position={[0, 0, DEPTH / 2 + 0.0032]}>
          <mesh geometry={geos.minute}><meshStandardMaterial color="#0e0e0f" roughness={0.4} metalness={0.4} /></mesh>
        </group>
        <group ref={second} position={[0, 0, DEPTH / 2 + 0.0044]}>
          <mesh position={[0, R * 0.32, 0]}>
            <boxGeometry args={[0.0009, R * 0.86, 0.0006]} />
            <meshStandardMaterial color="#111" roughness={0.4} />
          </mesh>
        </group>
        <mesh position={[0, 0, DEPTH / 2 + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0032, 0.0032, 0.003, 20]} />
          <meshStandardMaterial color="#0e0e0f" roughness={0.3} metalness={0.6} />
        </mesh>

        {/* domed glass */}
        <mesh position={[0, 0, DEPTH / 2 - 0.004]} scale={[1, 1, 0.14]}>
          <sphereGeometry args={[R * 0.92, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial color="#fff" transparent opacity={0.1} roughness={0.03} clearcoat={1} depthWrite={false} />
        </mesh>

        {/* bells, hammer, handle */}
        <group ref={bells}>
          <Bell side={-1} />
          <Bell side={1} />
          <mesh position={[0, R * 1.05, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0028, 0.0028, 0.016, 12]} />
            <meshStandardMaterial {...chrome} />
          </mesh>
        </group>
        <mesh position={[0, R * 0.98, -0.004]} castShadow>
          <torusGeometry args={[R * 0.68, 0.0022, 10, 48, Math.PI]} />
          <meshStandardMaterial {...chrome} />
        </mesh>
      </group>
    </group>
  )
}
