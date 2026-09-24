import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Select } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Wraps a desk object: hover lift + outline + floating label, click to focus.
 */
export default function Interactive({ id, label, sub, labelY = 0.15, lift = 0.012, children, ...props }) {
  const inner = useRef()
  const hovered = useStore((s) => s.hovered === id)
  const focus = useStore((s) => s.focus)
  const introDone = useStore((s) => s.introDone)
  const setHovered = useStore((s) => s.setHovered)
  const setFocus = useStore((s) => s.setFocus)
  const active = hovered && !focus

  useFrame((state, dt) => {
    const y = active ? lift + Math.sin(state.clock.elapsedTime * 2.2) * 0.002 : 0
    inner.current.position.y = THREE.MathUtils.damp(inner.current.position.y, y, 8, dt)
  })

  return (
    <group
      {...props}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (!focus && introDone) setHovered(id)
      }}
      onPointerOut={() => {
        if (useStore.getState().hovered === id) setHovered(null)
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (!focus && introDone) setFocus(id)
      }}
    >
      <Select enabled={active}>
        <group ref={inner}>{children}</group>
      </Select>
      <Html position={[0, labelY, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`hover-label ${active ? 'on' : ''}`}>
          <span className="hl-title">{label}</span>
          {sub && <span className="hl-sub">{sub}</span>}
        </div>
      </Html>
    </group>
  )
}
