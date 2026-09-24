import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store'
import { PROFILE } from '../data'

const PW = 0.216, PH = 0.279

function usePaperGeometry() {
  return useMemo(() => {
    const g = new THREE.PlaneGeometry(PW, PH, 24, 24)
    g.rotateX(-Math.PI / 2)
    g.userData.base = g.attributes.position.array.slice()
    return g
  }, [])
}

export default function Resume() {
  const tex = useTexture(import.meta.env.BASE_URL + PROFILE.resumeImage)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  const geo = usePaperGeometry()
  const curl = useRef(0)

  useFrame((state, dt) => {
    const { hovered, focus } = useStore.getState()
    const target = hovered === 'resume' ? 1 : focus === 'resume' ? 0.2 : 0
    curl.current = THREE.MathUtils.damp(curl.current, target, 5, dt)
    const p = geo.attributes.position
    const base = geo.userData.base
    const t = state.clock.elapsedTime
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2]
      const u = x / PW + 0.5, v = z / PH + 0.5 // v=1 is the near edge
      // resting: slight bow; hover: near-right corner lifts like a page about to turn
      const bow = 0.0015 * Math.sin(u * Math.PI)
      const d = Math.max(0, (u + v) / 2 - 0.55)
      const lift = curl.current * (d * d * 0.35 + Math.sin(t * 3 + u * 4) * 0.0004 * d)
      p.setY(i, 0.0012 + bow + lift)
    }
    p.needsUpdate = true
    geo.computeVertexNormals()
  })

  return (
    <group>
      {/* a sheet underneath for depth */}
      <mesh position={[0.006, 0.0006, -0.004]} rotation={[-Math.PI / 2, 0, 0.03]} receiveShadow>
        <planeGeometry args={[PW, PH]} />
        <meshStandardMaterial color="#d8d4cc" roughness={0.9} />
      </mesh>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial map={tex} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* pen */}
      <group position={[PW / 2 + 0.03, 0.0055, 0.01]} rotation={[0, 0.25, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.0048, 0.0048, 0.14, 20]} />
          <meshStandardMaterial color="#141416" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.074]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.0048, 0.012, 20]} />
          <meshStandardMaterial color="#b8a47a" roughness={0.25} metalness={1} />
        </mesh>
        <mesh position={[0, 0.005, -0.045]}>
          <boxGeometry args={[0.0018, 0.002, 0.045]} />
          <meshStandardMaterial color="#b8a47a" roughness={0.25} metalness={1} />
        </mesh>
      </group>
    </group>
  )
}
