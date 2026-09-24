import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { easing } from 'maath'
import * as THREE from 'three'
import { SHOTS, useStore } from '../store'

export default function CameraRig() {
  const { camera, size } = useThree()
  const look = useRef(new THREE.Vector3(...SHOTS.intro[1]))
  const pos = useRef(new THREE.Vector3())
  const tgtLook = useRef(new THREE.Vector3())
  const started = useRef(null)

  useEffect(() => {
    camera.position.set(...SHOTS.intro[0])
    camera.lookAt(look.current)
  }, [camera])

  useFrame((state, dt) => {
    const { focus, ready, introDone } = useStore.getState()
    if (!ready) return

    const portrait = size.width / size.height < 0.9
    const key = focus || (portrait ? 'homePortrait' : 'home')
    const [p, l] = SHOTS[key]
    pos.current.set(...p)
    tgtLook.current.set(...l)

    // gentle handheld parallax on the overview
    if (!focus) {
      pos.current.x += state.pointer.x * 0.12
      pos.current.y += state.pointer.y * 0.06
      pos.current.x += Math.sin(state.clock.elapsedTime * 0.25) * 0.02
      pos.current.y += Math.sin(state.clock.elapsedTime * 0.31) * 0.01
    } else {
      pos.current.x += state.pointer.x * 0.01
      pos.current.y += state.pointer.y * 0.006
    }

    const smooth = !introDone ? 1.1 : focus ? 0.45 : 0.6
    easing.damp3(camera.position, pos.current, smooth, dt)
    easing.damp3(look.current, tgtLook.current, smooth * 0.8, dt)
    camera.lookAt(look.current)

    const fov = portrait ? 46 : focus ? 34 : 32
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, fov, 3, dt)
      camera.updateProjectionMatrix()
    }
  })
  return null
}
