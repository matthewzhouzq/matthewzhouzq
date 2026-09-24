import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../store'

// Seconds since the intro started (0 until assets are ready)
let start = null
export function useIntroClock() {
  const t = useRef(0)
  useFrame((state) => {
    if (!useStore.getState().ready) return
    if (start === null) start = state.clock.elapsedTime
    t.current = state.clock.elapsedTime - start
  })
  return t
}
