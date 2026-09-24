import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { drawPhoneScreen } from './textures'
import { useStore } from '../store'

const W = 0.0716, H = 0.1466, T = 0.0082

export default function Phone() {
  const screen = useRef()
  const wake = useRef(0)
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 586
    c.height = 1200
    drawPhoneScreen(c)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      drawPhoneScreen(texture.image)
      texture.needsUpdate = true
    }, 30000)
    return () => clearInterval(id)
  }, [texture])

  useFrame((_, dt) => {
    const { hovered, focus } = useStore.getState()
    const on = hovered === 'phone' || focus === 'phone'
    wake.current = THREE.MathUtils.damp(wake.current, on ? 1 : 0.06, on ? 6 : 2, dt)
    screen.current.color.setScalar(wake.current * 1.1)
  })

  return (
    <group>
      {/* titanium frame */}
      <RoundedBox args={[W, T, H]} radius={0.0038} smoothness={5} position={[0, T / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#3a3b40" metalness={0.9} roughness={0.28} />
      </RoundedBox>
      {/* glass */}
      <RoundedBox args={[W - 0.0022, 0.0006, H - 0.0022]} radius={0.0003} position={[0, T + 0.0001, 0]}>
        <meshPhysicalMaterial color="#030304" roughness={0.05} clearcoat={1} clearcoatRoughness={0.02} />
      </RoundedBox>
      {/* display */}
      <mesh position={[0, T + 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.006, H - 0.006]} />
        <meshBasicMaterial ref={screen} map={texture} toneMapped={false} />
      </mesh>
      {/* dynamic island */}
      <mesh position={[0, T + 0.0008, -H / 2 + 0.011]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.02, 0.0055]} />
        <meshBasicMaterial color="#000" />
      </mesh>
    </group>
  )
}
