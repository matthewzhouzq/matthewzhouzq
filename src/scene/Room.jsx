import { useMemo } from 'react'
import { carpetMaps, wallMaps } from './textures'
import Skyline from './Skyline'
import { Foliage } from './Plant'
import { PALETTE } from '../data'

const WALL_Z = -1.25
const LEFT_X = -2.3

function Molding({ x, y, w, h, z = WALL_Z + 0.004 }) {
  const t = 0.018
  const mat = <meshStandardMaterial color="#1d1d20" roughness={0.6} />
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, h / 2, 0]}><boxGeometry args={[w, t, t]} />{mat}</mesh>
      <mesh position={[0, -h / 2, 0]}><boxGeometry args={[w, t, t]} />{mat}</mesh>
      <mesh position={[-w / 2, 0, 0]}><boxGeometry args={[t, h, t]} />{mat}</mesh>
      <mesh position={[w / 2, 0, 0]}><boxGeometry args={[t, h, t]} />{mat}</mesh>
    </group>
  )
}

function Books() {
  const books = useMemo(() => {
    const cols = [PALETTE.ink, '#161618', PALETTE.plum, '#1a1d1c', PALETTE.pine, '#2a2a2e']
    const arr = []
    let x = 0
    for (let i = 0; i < 11; i++) {
      const w = 0.025 + Math.random() * 0.02
      const h = 0.19 + Math.random() * 0.07
      arr.push({ x: x + w / 2, w, h, c: cols[i % cols.length], tilt: i === 10 ? 0.25 : 0 })
      x += w + 0.003
    }
    return arr
  }, [])
  return books.map((b, i) => (
    <mesh key={i} position={[b.x, b.h / 2, 0]} rotation={[0, 0, b.tilt]} castShadow>
      <boxGeometry args={[b.w, b.h, 0.16]} />
      <meshStandardMaterial color={b.c} roughness={0.8} />
    </mesh>
  ))
}

function Shelf({ position }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.025, 0.22]} />
        <meshStandardMaterial color="#111113" roughness={0.6} />
      </mesh>
      <group position={[-0.4, 0.0125, 0]}><Books /></group>
      <mesh position={[0.28, 0.07, 0]} castShadow>
        <sphereGeometry args={[0.058, 32, 32]} />
        <meshStandardMaterial color="#0e0e10" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0.12, 0.03, 0.02]} castShadow>
        <boxGeometry args={[0.14, 0.035, 0.1]} />
        <meshStandardMaterial color={PALETTE.mist} roughness={0.9} />
      </mesh>
    </group>
  )
}

function Window() {
  // tall window on the left wall, looking out over the Plateau at night
  return (
    <group position={[LEFT_X + 0.01, 1.4, -0.35]} rotation={[0, Math.PI / 2, 0]}>
      <Skyline width={1.1} height={1.9} />
      {/* mullions + frame */}
      {[[0, 0, 0.03, 1.9], [0, 0.2, 1.1, 0.03], [0, -0.95, 1.2, 0.06], [0, 0.95, 1.2, 0.06], [-0.56, 0, 0.06, 1.95], [0.56, 0, 0.06, 1.95]].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.02]}>
          <boxGeometry args={[w, h, 0.05]} />
          <meshStandardMaterial color="#0b0b0c" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function FloorPlant({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.17, 0.13, 0.4, 32]} />
        <meshStandardMaterial color="#141416" roughness={0.6} />
      </mesh>
      <group position={[0, 0.38, 0]}>
        <Foliage count={16} spread={0.55} height={0.9} leafSize={0.2} seed={3} />
      </group>
    </group>
  )
}

export default function Room() {
  const carpet = carpetMaps()
  const wall = wallMaps()
  return (
    <group>
      {/* carpet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial {...carpet} normalScale={[0.8, 0.8]} roughness={1} />
      </mesh>

      {/* back wall */}
      <mesh position={[0, 2, WALL_Z]} receiveShadow>
        <planeGeometry args={[10, 4]} />
        <meshStandardMaterial {...wall} normalScale={[0.35, 0.35]} roughness={0.88} />
      </mesh>
      {/* panel moldings like the reference photo */}
      {[-1.5, 0, 1.5].map((x) => (
        <Molding key={x} x={x} y={1.55} w={1.25} h={2.2} />
      ))}
      {/* skirting */}
      <mesh position={[0, 0.05, WALL_Z + 0.01]}>
        <boxGeometry args={[10, 0.1, 0.02]} />
        <meshStandardMaterial color="#0c0c0d" roughness={0.6} />
      </mesh>

      {/* left wall */}
      <mesh position={[LEFT_X, 2, 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial {...wall} normalScale={[0.35, 0.35]} roughness={0.88} />
      </mesh>
      <Window />

      <Shelf position={[-1.45, 1.62, WALL_Z + 0.11]} />
      <Shelf position={[-1.45, 1.22, WALL_Z + 0.11]} />

      <FloorPlant position={[-1.85, 0, -0.8]} scale={1.15} />
      <FloorPlant position={[1.55, 0, -0.95]} scale={0.95} />
    </group>
  )
}
