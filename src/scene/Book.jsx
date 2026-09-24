import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { PALETTE } from '../data'

// A clothbound hardcover — "Chapters". Spine on the left (−x), lying flat.
const W = 0.155, L = 0.225, BOARD = 0.0032, BLOCK = 0.024

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function cloth(g, w, h, base) {
  g.fillStyle = base
  g.fillRect(0, 0, w, h)
  // woven cloth: faint cross-hatch + noise
  for (let y = 0; y < h; y += 2) {
    g.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.05})`
    g.fillRect(0, y, w, 1)
  }
  for (let x = 0; x < w; x += 2) {
    g.fillStyle = `rgba(255,255,255,${0.015 + Math.random() * 0.02})`
    g.fillRect(x, 0, 1, h)
  }
}

function useBookTextures() {
  return useMemo(() => {
    const gold = '#c8a96a'
    const cover = canvasTex(620, 900, (g, w, h) => {
      cloth(g, w, h, PALETTE.pine)
      g.strokeStyle = gold
      g.lineWidth = 3
      g.strokeRect(36, 36, w - 72, h - 72)
      g.lineWidth = 1
      g.strokeRect(48, 48, w - 96, h - 96)
      g.fillStyle = gold
      g.textAlign = 'center'
      g.font = "300 84px 'Work Sans', Helvetica, Arial"
      g.fillText('Chapters', w / 2, h * 0.42)
      g.font = "400 22px 'JetBrains Mono', monospace"
      g.fillText('M · Z', w / 2, h * 0.42 + 60)
      // small emblem: a gear, for all the robots
      g.save()
      g.translate(w / 2, h * 0.72)
      g.beginPath()
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        const r = i % 2 ? 30 : 38
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      g.closePath()
      g.lineWidth = 2
      g.stroke()
      g.beginPath()
      g.arc(0, 0, 11, 0, Math.PI * 2)
      g.stroke()
      g.restore()
    })
    const endpaper = canvasTex(620, 900, (g, w, h) => {
      g.fillStyle = PALETTE.plum
      g.fillRect(0, 0, w, h)
      g.strokeStyle = 'rgba(200,169,106,0.14)'
      for (let i = -h; i < w; i += 26) {
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i + h, h)
        g.stroke()
      }
    })
    const page = canvasTex(620, 900, (g, w, h) => {
      g.fillStyle = '#ece5d6'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#2a2622'
      g.textAlign = 'center'
      g.font = "300 64px 'Work Sans', Helvetica, Arial"
      g.fillText('Chapters', w / 2, h * 0.36)
      g.font = "400 20px 'JetBrains Mono', monospace"
      g.fillStyle = '#6d655a'
      g.fillText('a working history', w / 2, h * 0.36 + 46)
      g.fillRect(w / 2 - 30, h * 0.36 + 80, 60, 1)
    })
    const edges = canvasTex(64, 256, (g, w, h) => {
      g.fillStyle = '#e4dccb'
      g.fillRect(0, 0, w, h)
      for (let y = 0; y < h; y += 2) {
        g.fillStyle = `rgba(90,70,50,${0.06 + Math.random() * 0.1})`
        g.fillRect(0, y, w, 1)
      }
    })
    const spineCloth = canvasTex(64, 512, (g, w, h) => cloth(g, w, h, PALETTE.pine))
    return { cover, endpaper, page, edges, spineCloth }
  }, [])
}

export default function Book() {
  const lid = useRef()
  const angle = useRef(0)
  const tex = useBookTextures()

  const clothMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: tex.spineCloth, roughness: 0.85 }),
    [tex]
  )
  const coverMats = useMemo(() => {
    const face = new THREE.MeshStandardMaterial({ map: tex.cover, roughness: 0.8 })
    const inner = new THREE.MeshStandardMaterial({ map: tex.endpaper, roughness: 0.9 })
    // box faces: +x, −x, +y, −y, +z, −z
    return [clothMat, clothMat, face, inner, clothMat, clothMat]
  }, [tex, clothMat])
  const blockMats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ map: tex.edges, roughness: 0.95 })
    const top = new THREE.MeshStandardMaterial({ map: tex.page, roughness: 0.9 })
    return [edge, clothMat, top, edge, edge, edge]
  }, [tex, clothMat])

  useFrame((state, dt) => {
    const { hovered, focus } = useStore.getState()
    const target = focus === 'book' ? Math.PI * 0.985 : hovered === 'book' ? 0.32 : 0
    angle.current = THREE.MathUtils.damp(angle.current, target, focus === 'book' ? 3.2 : 6, dt)
    lid.current.rotation.z = angle.current
  })

  const topY = BOARD + BLOCK
  return (
    <group>
      {/* back board */}
      <mesh position={[0, BOARD / 2, 0]} material={clothMat} castShadow receiveShadow>
        <boxGeometry args={[W, BOARD, L]} />
      </mesh>
      {/* text block */}
      <mesh position={[0.002, BOARD + BLOCK / 2, 0]} material={blockMats} castShadow receiveShadow>
        <boxGeometry args={[W - 0.008, BLOCK, L - 0.008]} />
      </mesh>
      {/* rounded spine */}
      <mesh position={[-W / 2, topY / 2 + BOARD / 2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.35, 1, 1]} material={clothMat} castShadow>
        <cylinderGeometry args={[(topY + BOARD) / 2, (topY + BOARD) / 2, L, 24, 1, false, Math.PI, Math.PI]} />
      </mesh>
      {/* ribbon bookmark */}
      <mesh position={[0.03, BOARD + BLOCK * 0.6, L / 2 + 0.018]} rotation={[-Math.PI / 2 + 0.25, 0, 0.08]}>
        <planeGeometry args={[0.007, 0.045]} />
        <meshStandardMaterial color={PALETTE.teal} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* front board, hinged at the spine */}
      <group ref={lid} position={[-W / 2, topY + BOARD / 2, 0]}>
        <mesh position={[W / 2, 0, 0]} material={coverMats} castShadow receiveShadow>
          <boxGeometry args={[W, BOARD, L]} />
        </mesh>
      </group>
    </group>
  )
}
