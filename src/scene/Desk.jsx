import { RoundedBox } from '@react-three/drei'
import { matteNoise } from './textures'
import { DESK_Y } from '../store'

const W = 1.7, D = 0.8, T = 0.03

export default function Desk() {
  const noise = matteNoise()
  const legH = DESK_Y - T
  const steel = <meshStandardMaterial color="#0e0e10" roughness={0.45} metalness={0.6} />
  const legs = [
    [-W / 2 + 0.04, -D / 2 + 0.04],
    [W / 2 - 0.04, -D / 2 + 0.04],
    [-W / 2 + 0.04, D / 2 - 0.04],
    [W / 2 - 0.04, D / 2 - 0.04],
  ]
  return (
    <group>
      <RoundedBox args={[W, T, D]} radius={0.006} smoothness={3} position={[0, DESK_Y - T / 2, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#0b0b0c"
          roughness={0.42}
          roughnessMap={noise}
          clearcoat={0.35}
          clearcoatRoughness={0.35}
        />
      </RoundedBox>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, legH / 2, z]} castShadow>
          <boxGeometry args={[0.03, legH, 0.03]} />
          {steel}
        </mesh>
      ))}
      {/* apron rails */}
      {[-1, 1].map((s) => (
        <mesh key={'x' + s} position={[0, legH - 0.03, s * (D / 2 - 0.04)]}>
          <boxGeometry args={[W - 0.08, 0.05, 0.02]} />
          {steel}
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={'z' + s} position={[s * (W / 2 - 0.04), legH - 0.03, 0]}>
          <boxGeometry args={[0.02, 0.05, D - 0.08]} />
          {steel}
        </mesh>
      ))}
      {/* thin felt desk mat under laptop */}
      <RoundedBox args={[0.62, 0.003, 0.34]} radius={0.0015} position={[0.02, DESK_Y + 0.0015, -0.02]} rotation={[0, -0.12, 0]} receiveShadow>
        <meshStandardMaterial color="#1c1d21" roughness={1} />
      </RoundedBox>
    </group>
  )
}
