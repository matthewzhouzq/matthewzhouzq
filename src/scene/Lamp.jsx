import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useIntroClock } from './useIntroClock'

// Minimal folding LED bar lamp (cold light)
const POLE = 0.42
const ARM = 0.46
const COLD = new THREE.Color('#d6e6ff')

export default function Lamp(props) {
  const light = useRef()
  const strip = useRef()
  const target = useMemo(() => new THREE.Object3D(), [])
  const intro = useIntroClock()

  useFrame(() => {
    const t = intro.current
    // flicker on at ~0.9s, settle by ~1.6s
    let k = 0
    if (t > 0.9) k = 1
    if (t > 0.9 && t < 1.6) k = Math.random() > 0.35 ? 1 : 0.15
    const on = THREE.MathUtils.lerp(light.current.userData.k ?? 0, k, 0.5)
    light.current.userData.k = on
    light.current.intensity = on * 7
    strip.current.color.copy(COLD).multiplyScalar(0.3 + on * 2.8)
  })

  return (
    <group {...props}>
      {/* weighted base */}
      <RoundedBox args={[0.11, 0.045, 0.075]} radius={0.018} smoothness={4} position={[0, 0.0225, 0]} castShadow>
        <meshStandardMaterial color="#141416" roughness={0.5} />
      </RoundedBox>
      {/* dimmer knob */}
      <mesh position={[0.025, 0.026, 0.039]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.008, 24]} />
        <meshStandardMaterial color="#2b2b2e" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* usb ports */}
      {[-0.018, -0.03].map((x) => (
        <mesh key={x} position={[x, 0.024, 0.038]}>
          <boxGeometry args={[0.007, 0.004, 0.002]} />
          <meshBasicMaterial color="#000" />
        </mesh>
      ))}
      {/* pole */}
      <mesh position={[-0.02, 0.045 + POLE / 2, 0]} castShadow>
        <cylinderGeometry args={[0.0065, 0.0075, POLE, 16]} />
        <meshStandardMaterial color="#27282b" roughness={0.35} metalness={0.7} />
      </mesh>
      {/* hinge */}
      <mesh position={[-0.02, 0.045 + POLE + 0.006, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.011, 0.011, 0.02, 20]} />
        <meshStandardMaterial color="#2f3033" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* LED bar, tilted slightly */}
      <group position={[-0.02, 0.045 + POLE + 0.012, 0]} rotation={[0, 0, -0.06]}>
        <RoundedBox args={[ARM, 0.011, 0.028]} radius={0.004} position={[ARM / 2 - 0.03, 0, 0]} castShadow>
          <meshStandardMaterial color="#2a2b2e" roughness={0.35} metalness={0.6} />
        </RoundedBox>
        {/* faint edge glow so the bar reads against the dark wall */}
        <mesh position={[ARM / 2 - 0.03, 0, 0.0142]}>
          <planeGeometry args={[ARM - 0.01, 0.004]} />
          <meshBasicMaterial color={[0.35, 0.4, 0.48]} toneMapped={false} />
        </mesh>
        {/* emissive diffuser */}
        <mesh position={[ARM / 2 - 0.02, -0.0058, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[ARM - 0.05, 0.018]} />
          <meshBasicMaterial ref={strip} toneMapped={false} />
        </mesh>
        <spotLight
          ref={light}
          position={[ARM / 2 - 0.02, -0.01, 0]}
          target={target}
          color={COLD}
          angle={1.05}
          penumbra={0.85}
          distance={3}
          decay={2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
          shadow-radius={6}
        />
        <primitive object={target} position={[ARM / 2 - 0.02, -1, 0.05]} />
      </group>
    </group>
  )
}
