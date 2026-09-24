import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '../data'
import { useStore } from '../store'

function rng(seed) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// One curved leaf, pointing +Y, bent toward +Z
function makeLeafGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(0.42, 0.22, 0.38, 0.72, 0, 1)
  s.bezierCurveTo(-0.38, 0.72, -0.42, 0.22, 0, 0)
  const g = new THREE.ShapeGeometry(s, 16)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i)
    // bend along length + fold along the midrib
    p.setZ(i, -0.35 * y * y + 0.18 * Math.abs(x))
  }
  g.computeVertexNormals()
  return g
}
const leafGeo = makeLeafGeometry()

export function Foliage({ count = 9, spread = 0.12, height = 0.18, leafSize = 0.06, seed = 1, rustleId }) {
  const leaves = useMemo(() => {
    const r = rng(seed)
    const cols = [PALETTE.teal, '#2b5549', '#3d7263', PALETTE.pine, '#2f5f52']
    return Array.from({ length: count }, (_, i) => {
      const yaw = (i / count) * Math.PI * 2 + r() * 0.8
      const tilt = 0.85 + r() * 0.65
      const h = height * (0.45 + r() * 0.55)
      return {
        yaw,
        tilt,
        h,
        size: leafSize * (0.75 + r() * 0.5),
        col: cols[Math.floor(r() * cols.length)],
        phase: r() * 10,
        out: spread * (0.15 + r() * 0.35),
      }
    })
  }, [count, spread, height, leafSize, seed])

  const refs = useRef([])
  const energy = useRef(0)
  useFrame((state, dt) => {
    const hovered = rustleId && useStore.getState().hovered === rustleId
    energy.current = THREE.MathUtils.damp(energy.current, hovered ? 1 : 0, 3, dt)
    const t = state.clock.elapsedTime
    refs.current.forEach((g, i) => {
      if (!g) return
      const L = leaves[i]
      const amp = 0.03 + energy.current * 0.14
      g.rotation.x = L.tilt + Math.sin(t * (1.1 + energy.current * 5) + L.phase) * amp
      g.rotation.z = Math.sin(t * 0.7 + L.phase * 1.3) * amp * 0.6
    })
  })

  return leaves.map((L, i) => (
    <group key={i} rotation={[0, L.yaw, 0]}>
      {/* stem */}
      <mesh position={[0, L.h / 2, L.out / 2]} rotation={[Math.atan2(L.out, L.h), 0, 0]}>
        <cylinderGeometry args={[0.0025 * (leafSize / 0.06), 0.004 * (leafSize / 0.06), Math.hypot(L.h, L.out), 5]} />
        <meshStandardMaterial color="#29463d" roughness={0.8} />
      </mesh>
      <group position={[0, L.h, L.out]} ref={(el) => (refs.current[i] = el)}>
        <mesh geometry={leafGeo} scale={L.size} castShadow>
          <meshStandardMaterial color={L.col} roughness={0.55} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  ))
}

function SoccerBall({ r = 0.028 }) {
  const dirs = useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(1, 0)
    const p = ico.attributes.position
    const seen = new Map()
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize()
      seen.set(v.toArray().map((n) => n.toFixed(3)).join(), v)
    }
    return [...seen.values()]
  }, [])
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[r, 32, 32]} />
        <meshStandardMaterial color="#d9d6cf" roughness={0.5} />
      </mesh>
      {dirs.map((d, i) => {
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d)
        return (
          <mesh key={i} position={d.clone().multiplyScalar(r * 1.002)} quaternion={q}>
            <circleGeometry args={[r * 0.36, 5]} />
            <meshStandardMaterial color="#161618" roughness={0.6} />
          </mesh>
        )
      })}
    </group>
  )
}

export default function Plant() {
  return (
    <group>
      {/* ceramic pot */}
      <mesh position={[0, 0.045, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.038, 0.09, 40]} />
        <meshPhysicalMaterial color={PALETTE.plum} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.3} />
      </mesh>
      <mesh position={[0, 0.087, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.046, 32]} />
        <meshStandardMaterial color="#1a1512" roughness={1} />
      </mesh>
      <group position={[0, 0.085, 0]}>
        <Foliage count={15} spread={0.22} height={0.13} leafSize={0.07} seed={7} rustleId="plant" />
      </group>
      {/* little symbols of life outside work */}
      <group position={[-0.03, 0.028, 0.1]}>
        <SoccerBall />
      </group>
    </group>
  )
}
