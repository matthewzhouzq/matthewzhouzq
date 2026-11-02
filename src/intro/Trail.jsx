import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COLOR = '#ecc9d1' // cloud-rose light

function useTrailMaterial(loop) {
  return useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uTail: { value: -1 }, uHead: { value: -1 }, uFade: { value: 0.3 }, uThread: { value: 0 }, uOn: { value: 0 }, uColor: { value: new THREE.Color(COLOR) } },
    vertexShader: 'varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: loop
      ? `uniform float uTail, uFade, uThread, uOn; uniform vec3 uColor; varying float vU;
        void main(){
          float d = fract(uTail - vU);                    // how far behind the tail, around the ring
          float hot = (1.0 - smoothstep(0.0, uFade, d)) * uOn;
          float a = max(hot, uThread * 0.07);
          gl_FragColor = vec4(uColor * (0.35 + 2.4 * hot), a);
        }`
      : `uniform float uTail, uHead, uFade; uniform vec3 uColor; varying float vU;
        void main(){
          if (vU > uHead) discard;
          float hot = smoothstep(uTail - uFade, uTail, vU) * (1.0 - smoothstep(uTail, uHead, vU) * 0.85);
          float a = max(hot, 0.07);
          gl_FragColor = vec4(uColor * (0.35 + 2.6 * hot), a);
        }`,
  }), [loop])
}

/** Scene 1: a thread of light along the flight line, hot just behind the tail. */
export function LineTrail({ path, drive }) {
  const geo = useMemo(() => new THREE.TubeGeometry(path.curve, 900, 0.035 * drive.scale + 0.02, 8, false), [path, drive.scale])
  const mat = useTrailMaterial(false)
  useFrame(() => {
    if (drive.sHead === null) return
    if (drive.mode === 1) {
      mat.uniforms.uHead.value = drive.sHead / path.length
      mat.uniforms.uTail.value = (drive.sHead - drive.bodyLen) / path.length
      mat.uniforms.uFade.value = Math.min(0.35, (drive.bodyLen * 1.3) / path.length)
    } else { mat.uniforms.uHead.value = 2; mat.uniforms.uTail.value = 2 } // dragon has moved on: leave the faint thread
  })
  return <mesh geometry={geo} material={mat} frustumCulled={false} />
}

/** Scene 2: a ring of light that the circling dragon keeps re-lighting. */
export function RingTrail({ path, drive }) {
  const geo = useMemo(() => new THREE.TubeGeometry(path.ring, 600, 0.03 * drive.scale + 0.02, 8, true), [path, drive.scale])
  const mat = useTrailMaterial(true)
  useFrame((_, dt) => {
    const u = mat.uniforms
    const on = drive.mode === 2 && drive.sHead !== null
    const tail = on ? drive.sHead - drive.bodyLen - path.leadLen : -1
    u.uOn.value = THREE.MathUtils.damp(u.uOn.value, on && tail > 0 ? 1 : 0, 3, dt)
    u.uThread.value = THREE.MathUtils.damp(u.uThread.value, on && drive.sHead > path.leadLen ? 1 : 0, 1.5, dt)
    if (tail > 0) u.uTail.value = (tail / path.circ) % 1
    u.uFade.value = Math.min(0.45, (drive.bodyLen * 0.9) / path.circ)
  })
  return <mesh geometry={geo} material={mat} frustumCulled={false} />
}
