import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// A thin ribbon of light along the flight path: bright just behind the tail, fading back to a faint thread.
export default function Trail({ path, drive }) {
  const geo = useMemo(() => path && new THREE.TubeGeometry(path.curve, 900, 0.035 * drive.scale + 0.02, 8, false), [path, drive.scale])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uTail: { value: -1 }, uHead: { value: -1 }, uFade: { value: 0.3 }, uColor: { value: new THREE.Color('#bfe6ff') } },
    vertexShader: 'varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uTail, uHead, uFade; uniform vec3 uColor; varying float vU;
      void main(){
        if (vU > uHead) discard;
        float hot = smoothstep(uTail - uFade, uTail, vU) * (1.0 - smoothstep(uTail, uHead, vU) * 0.85);
        float thread = 0.07;
        float a = max(hot, thread);
        gl_FragColor = vec4(uColor * (0.35 + 2.6 * hot), a);
      }`,
  }), [])
  useFrame(() => {
    if (!path || drive.sHead === null) return
    mat.uniforms.uHead.value = drive.sHead / path.length
    mat.uniforms.uTail.value = (drive.sHead - drive.bodyLen) / path.length
    mat.uniforms.uFade.value = Math.min(0.35, (drive.bodyLen * 1.3) / path.length)
  })
  if (!geo) return null
  return <mesh geometry={geo} material={mat} frustumCulled={false} />
}
