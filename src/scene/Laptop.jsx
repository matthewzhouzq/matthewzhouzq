import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { keyboardTexture, laptopScreenTexture } from './textures'
import { useStore } from '../store'
import { useIntroClock } from './useIntroClock'

const W = 0.304, D = 0.212, BH = 0.0125, LT = 0.0055
const ALU = '#8d9096'

export default function Laptop() {
  const lid = useRef()
  const screen = useRef()
  const glow = useRef()
  const intro = useIntroClock()
  const openAngle = useRef(1.2)

  useFrame((state, dt) => {
    const { hovered, focus } = useStore.getState()
    const hot = hovered === 'laptop' || focus === 'laptop'
    const boot = THREE.MathUtils.clamp((intro.current - 2.0) * 1.5, 0, 1)
    // lid opens wider when you're paying attention to it
    const targetAngle = (hot ? 1.86 : 1.78) * Math.min(1, 0.6 + boot)
    openAngle.current = THREE.MathUtils.damp(openAngle.current, targetAngle, 4, dt)
    lid.current.rotation.x = -openAngle.current
    const b = boot * (hot ? 1.35 : 0.95) + Math.sin(state.clock.elapsedTime * 0.8) * 0.02
    screen.current.color.setScalar(b)
    glow.current.intensity = boot * (hot ? 0.35 : 0.22)
  })

  return (
    <group>
      {/* base */}
      <RoundedBox args={[W, BH, D]} radius={0.005} smoothness={4} position={[0, BH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={ALU} metalness={0.85} roughness={0.32} />
      </RoundedBox>
      {/* keyboard well */}
      <mesh position={[0, BH + 0.0003, -0.028]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.27, 0.105]} />
        <meshStandardMaterial map={keyboardTexture()} roughness={0.6} />
      </mesh>
      {/* trackpad */}
      <mesh position={[0, BH + 0.0003, 0.062]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.12, 0.072]} />
        <meshStandardMaterial color="#7c7f85" metalness={0.7} roughness={0.25} />
      </mesh>

      {/* lid — hinge at the back edge */}
      <group ref={lid} position={[0, BH, -D / 2 + 0.002]}>
        <RoundedBox args={[W, LT, D]} radius={0.0025} smoothness={3} position={[0, LT / 2, D / 2]} castShadow>
          <meshStandardMaterial color={ALU} metalness={0.85} roughness={0.3} />
        </RoundedBox>
        {/* bezel */}
        <mesh position={[0, -0.0002, D / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W - 0.006, D - 0.006]} />
          <meshStandardMaterial color="#050506" roughness={0.15} />
        </mesh>
        {/* display */}
        <mesh position={[0, -0.0006, D / 2 + 0.003]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.286, 0.179]} />
          <meshBasicMaterial ref={screen} map={laptopScreenTexture()} toneMapped={false} />
        </mesh>
        <pointLight ref={glow} position={[0, -0.12, D / 2]} color="#7fb3a4" distance={0.8} decay={2} />
      </group>
    </group>
  )
}
