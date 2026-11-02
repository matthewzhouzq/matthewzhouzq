import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export const DRAGON_URL = `${import.meta.env.BASE_URL}models/dragon.glb`
const NB = 30 // spine bones, Spine_00 (behind the head) → Spine_29 (tail tip)

/** Glossy black scales (toned down): clearcoat + the baked normal map, with a faint glow along scale ridges. */
function makeScaleMaterial(normalMap) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#08080b', roughness: 0.44, metalness: 0.14,
    clearcoat: 0.65, clearcoatRoughness: 0.24, normalMap, normalScale: new THREE.Vector2(1.35, 1.35),
    sheen: 0.32, sheenColor: new THREE.Color('#6e5f6a'), sheenRoughness: 0.5,
  })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uGlow = { value: new THREE.Color('#c79aa6').multiplyScalar(1.5) }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uGlow;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #ifdef USE_NORMALMAP_TANGENTSPACE
        float ridge = clamp(length(mapN.xy) * 1.6, 0.0, 1.0);
        float rim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.5);
        totalEmissiveRadiance += uGlow * (smoothstep(0.4, 0.92, ridge) * 0.14 + rim * 0.13);
      #endif`)
  }
  return m
}

export default function Dragon({ drive, plan }) {
  const { scene } = useGLTF(DRAGON_URL, true)

  const rig = useMemo(() => {
    const bones = {}
    scene.traverse((o) => {
      if (o.isBone) bones[o.name] = o
      if (o.isMesh) {
        o.frustumCulled = false
        if (o.name.includes('Eye') || o.material?.name === 'DragonEye') {
          // tiny bright white dots for eyes, same light as the trail
          const pos = o.geometry.attributes.position
          const sides = [[], []] // left / right eye, split by which side of the head they sit on
          for (let i = 0; i < pos.count; i++) sides[pos.getZ(i) > 0 ? 0 : 1].push(i)
          for (const idx of sides) {
            if (!idx.length) continue
            const c = new THREE.Vector3()
            for (const i of idx) c.add(new THREE.Vector3().fromBufferAttribute(pos, i))
            c.divideScalar(idx.length)
            for (const i of idx) {
              const v = new THREE.Vector3().fromBufferAttribute(pos, i).sub(c).multiplyScalar(0.32).add(c)
              pos.setXYZ(i, v.x, v.y, v.z)
            }
          }
          pos.needsUpdate = true
          o.material = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4f6').multiplyScalar(2.2), toneMapped: false })
        } else {
          o.material = makeScaleMaterial(o.material.normalMap)
        }
      }
    })
    const restQ = Object.fromEntries(Object.entries(bones).map(([n, b]) => [n, b.quaternion.clone()]))
    const spineLen = bones.Spine_01.position.length() // bone length in rig units
    const headLen = 1.29
    return { bones, restQ, spineLen, headLen, root: bones.Spine_00.parent }
  }, [scene])

  // scratch
  const tmp = useMemo(() => ({
    P: new THREE.Vector3(), T: new THREE.Vector3(), up: new THREE.Vector3(), side: new THREE.Vector3(),
    joints: Array.from({ length: NB + 2 }, () => new THREE.Vector3()),
    ups: Array.from({ length: NB + 2 }, () => new THREE.Vector3()),
    m: new THREE.Matrix4(), q: new THREE.Quaternion(), pq: new THREE.Quaternion(), x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3(),
    wq: Array.from({ length: NB + 1 }, () => new THREE.Quaternion()), qa: new THREE.Quaternion(), ax: new THREE.Vector3(1, 0, 0),
    Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1),
  }), [])

  const group = useRef()
  useEffect(() => { group.current.scale.setScalar(drive.scale) }, [drive.scale])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const s = drive.scale
    const { bones, restQ, spineLen, headLen } = rig
    const { joints, ups, Y, Z } = tmp
    const bl = spineLen * s
    // scroll → which path we're on and where the head should be (eased, so the flight glides instead of snapping)
    drive.bodyLen = (headLen + NB * spineLen) * s
    const dt = Math.min(delta, 0.05)
    plan(drive, dt)
    const path = drive.path
    const gap = drive.target - drive.sHead
    drive.sHead += gap * (1 - Math.exp(-dt * 2.6))
    drive.wavePhase += dt * (3.4 + Math.min(7, Math.abs(gap) / s))
    const sh = drive.sHead // arc length of the head joint (world units)
    const wave = drive.wavePhase

    // joint targets: 0 = snout, 1 = head joint, 2.. = spine joints down the tail
    for (let k = 0; k < NB + 2; k++) {
      const b = k === 0 ? -headLen * s : (k - 1) * bl // distance behind the head joint
      path.sample(sh - b, tmp.P, tmp.T)
      // "up" = screen-up projected off the tangent, tipped toward the camera so it never flips
      tmp.up.copy(Y).addScaledVector(tmp.T, -Y.dot(tmp.T)).addScaledVector(Z, 0.55)
      tmp.up.addScaledVector(tmp.T, -tmp.up.dot(tmp.T)).normalize()
      tmp.side.crossVectors(tmp.T, tmp.up)
      const env = 0.35 + 0.65 * Math.min(1, Math.max(0, (b + headLen * s) / (4 * s)))
      const vert = 0.55 * s * env * Math.sin((b / (7 * s)) * Math.PI * 2 - wave)
      const lat = 0.3 * s * env * Math.sin((b / (9 * s)) * Math.PI * 2 - wave * 0.6 + 1.3)
      joints[k].copy(tmp.P).addScaledVector(tmp.up, vert).addScaledVector(tmp.side, lat)
      ups[k].copy(tmp.up)
    }
    // keep bone lengths exact: walk the chain from the head joint
    for (let k = 2; k < NB + 2; k++) {
      tmp.x.subVectors(joints[k], joints[k - 1]).normalize()
      joints[k].copy(joints[k - 1]).addScaledVector(tmp.x, bl)
    }

    // world → bone rotations. Bone local frame: +Y along the bone, +Z = dorsal (up through the back)
    const root = rig.root
    root.updateWorldMatrix(true, false)
    root.getWorldQuaternion(tmp.pq)
    const frame = (dir, upv, out) => {
      tmp.y.copy(dir).normalize()
      tmp.z.copy(upv).addScaledVector(tmp.y, -upv.dot(tmp.y)).normalize()
      tmp.x.crossVectors(tmp.y, tmp.z)
      tmp.m.makeBasis(tmp.x, tmp.y, tmp.z)
      return out.setFromRotationMatrix(tmp.m)
    }
    // spine
    let parentQ = tmp.pq.clone()
    for (let k = 0; k < NB; k++) {
      const bone = bones[`Spine_${String(k).padStart(2, '0')}`]
      tmp.T.subVectors(joints[k + 2], joints[k + 1])
      tmp.up.copy(ups[k + 1]).add(ups[k + 2])
      frame(tmp.T, tmp.up, tmp.wq[k])
      bone.quaternion.copy(parentQ).invert().multiply(tmp.wq[k])
      parentQ = tmp.wq[k]
      if (k === 0) bone.position.copy(root.worldToLocal(tmp.P.copy(joints[1])))
    }
    // head looks toward the snout target
    tmp.T.subVectors(joints[0], joints[1])
    frame(tmp.T, ups[0], tmp.q)
    bones.Head.quaternion.copy(tmp.wq[0]).invert().multiply(tmp.q)

    // arms: paddle gently, left/right out of phase, claws flex
    const paddle = (name, phase, amp) => {
      const b = bones[name]; if (!b) return
      tmp.qa.setFromAxisAngle(tmp.ax, amp * Math.sin(t * 2.4 + phase))
      b.quaternion.copy(restQ[name]).multiply(tmp.qa)
    }
    for (const [side, ph] of [['A', 0], ['B', Math.PI]]) {
      paddle(`Arm${side}_upper`, ph, 0.22)
      paddle(`Arm${side}_fore`, ph - 0.7, 0.16)
      paddle(`Arm${side}_claw`, ph - 1.3, 0.24)
    }
  })

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(DRAGON_URL, true)
