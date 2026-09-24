import { RoundedBox } from '@react-three/drei'

// Modern padded task chair, soft grey fabric. Origin = floor under the gas lift.
const FABRIC = '#6c6b6f'

function Fabric(props) {
  return <meshStandardMaterial color={FABRIC} roughness={0.96} {...props} />
}

export default function Chair(props) {
  const dark = <meshStandardMaterial color="#121214" roughness={0.4} metalness={0.5} />
  return (
    <group {...props}>
      {/* 5-star base */}
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0, 0.075, 0.16]} rotation={[0.08, 0, 0]} castShadow>
              <boxGeometry args={[0.045, 0.03, 0.32]} />
              {dark}
            </mesh>
            {/* caster */}
            <mesh position={[0, 0.03, 0.31]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.028, 0.028, 0.035, 20]} />
              <meshStandardMaterial color="#0a0a0b" roughness={0.3} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.04, 24]} />
        {dark}
      </mesh>
      {/* gas lift */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.028, 0.3, 20]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.2} metalness={0.9} />
      </mesh>
      {/* seat mechanism */}
      <mesh position={[0, 0.41, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.22]} />
        {dark}
      </mesh>

      {/* seat: shell + thick cushion */}
      <RoundedBox args={[0.54, 0.05, 0.5]} radius={0.02} position={[0, 0.45, 0.01]} castShadow>
        <meshStandardMaterial color="#1d1d20" roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.52, 0.09, 0.49]} radius={0.04} smoothness={5} position={[0, 0.51, 0.015]} castShadow receiveShadow>
        <Fabric />
      </RoundedBox>
      {/* seat front roll */}
      <mesh position={[0, 0.51, 0.25]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.045, 0.43, 8, 16]} />
        <Fabric />
      </mesh>

      {/* back: spine + horizontally channelled pads, reclined slightly */}
      <group position={[0, 0.56, -0.24]} rotation={[-0.14, 0, 0]}>
        <mesh position={[0, 0.2, -0.03]} castShadow>
          <boxGeometry args={[0.07, 0.4, 0.03]} />
          {dark}
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <RoundedBox
            key={i}
            args={[0.5 - (i === 4 ? 0.04 : 0), 0.13, 0.085]}
            radius={0.04}
            smoothness={5}
            position={[0, 0.12 + i * 0.125, 0.01]}
            castShadow
            receiveShadow
          >
            <Fabric />
          </RoundedBox>
        ))}
        {/* side bolsters */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.255, 0.38, 0.03]} castShadow>
            <capsuleGeometry args={[0.035, 0.52, 8, 16]} />
            <Fabric />
          </mesh>
        ))}
      </group>

      {/* armrests */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.3, 0.45, -0.02]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.03, 0.2, 0.05]} />
            {dark}
          </mesh>
          <RoundedBox args={[0.07, 0.035, 0.26]} radius={0.015} position={[0, 0.215, 0.02]} castShadow>
            <meshStandardMaterial color="#1b1b1e" roughness={0.75} />
          </RoundedBox>
        </group>
      ))}
    </group>
  )
}
