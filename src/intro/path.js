import * as THREE from 'three'

// The flight line, traced from the sketch. Normalised screen space: x 0→1 left→right, y 0→1 top→bottom.
// Enters off-screen right, squiggles left across the top, loops at the left edge, exits right along the bottom.
export const PATH_POINTS = [
  [1.22, 0.24], [1.03, 0.29], [0.94, 0.22], [0.86, 0.22], [0.8, 0.3], [0.74, 0.43], [0.67, 0.55],
  [0.61, 0.6], [0.55, 0.57], [0.47, 0.46], [0.37, 0.37], [0.28, 0.31], [0.21, 0.35], [0.17, 0.45],
  [0.17, 0.55], [0.12, 0.62], [0.06, 0.67], [0.04, 0.73], [0.08, 0.79], [0.18, 0.81], [0.3, 0.78],
  [0.41, 0.72], [0.5, 0.73], [0.57, 0.81], [0.68, 0.86], [0.8, 0.86], [0.92, 0.83], [1.24, 0.81],
]

/** World-space curve for the current viewport (z = 0 plane). */
export function makeWorldPath(width, height) {
  const pts = PATH_POINTS.map(([x, y]) => new THREE.Vector3((x - 0.5) * width, (0.5 - y) * height, 0))
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  const length = curve.getLength()
  const a = curve.getPointAt(0), b = curve.getPointAt(1)
  const ta = curve.getTangentAt(0), tb = curve.getTangentAt(1)
  const p = new THREE.Vector3(), t = new THREE.Vector3()
  // point / tangent at arc length s, extended straight past both ends
  const sample = (s, outP, outT) => {
    if (s <= 0) { outT.copy(ta); outP.copy(a).addScaledVector(ta, s) }
    else if (s >= length) { outT.copy(tb); outP.copy(b).addScaledVector(tb, s - length) }
    else { const u = s / length; curve.getPointAt(u, outP); curve.getTangentAt(u, outT) }
  }
  // nearest arc-fraction to a normalised screen point (used to time the text reveals)
  const nearestU = (nx, ny) => {
    const q = new THREE.Vector3((nx - 0.5) * width, (0.5 - ny) * height, 0)
    let best = 0, bd = Infinity
    for (let i = 0; i <= 400; i++) { curve.getPointAt(i / 400, p); const d = p.distanceToSquared(q); if (d < bd) { bd = d; best = i / 400 } }
    return best
  }
  return { curve, length, sample, nearestU, _p: p, _t: t }
}

/**
 * Scene 2: swoop in from the left, rise over the top and settle into a clockwise circle (loops forever).
 * cx, cy, r in world units; left = x of the scene's left edge.
 */
export function makeCirclePath(cx, cy, r, left) {
  const th0 = (150 * Math.PI) / 180 // join the circle at its upper-left, heading up and right
  const P0 = new THREE.Vector3(cx + r * Math.cos(th0), cy + r * Math.sin(th0), 0)
  const T0 = new THREE.Vector3(Math.sin(th0), -Math.cos(th0), 0) // clockwise tangent
  const lead = new THREE.CatmullRomCurve3([
    new THREE.Vector3(left - r * 1.4, cy - r * 0.05, 0),
    new THREE.Vector3(left - r * 0.2, cy - r * 0.08, 0),
    new THREE.Vector3(left + (P0.x - left) * 0.55, cy - r * 0.02, 0),
    P0.clone().addScaledVector(T0, -r * 0.35),
    P0.clone(),
  ], false, 'centripetal')
  const leadLen = lead.getLength()
  const circ = 2 * Math.PI * r
  const a = lead.getPointAt(0), ta = lead.getTangentAt(0)
  const sample = (s, outP, outT) => {
    if (s <= 0) { outT.copy(ta); outP.copy(a).addScaledVector(ta, s) }
    else if (s < leadLen) { const u = s / leadLen; lead.getPointAt(u, outP); lead.getTangentAt(u, outT) }
    else {
      const th = th0 - (s - leadLen) / r
      outP.set(cx + r * Math.cos(th), cy + r * Math.sin(th), 0)
      outT.set(Math.sin(th), -Math.cos(th), 0)
    }
  }
  // closed curve for the glowing ring the dragon leaves behind
  const ring = new THREE.CatmullRomCurve3(
    Array.from({ length: 96 }, (_, i) => { const th = th0 - (i / 96) * Math.PI * 2; return new THREE.Vector3(cx + r * Math.cos(th), cy + r * Math.sin(th), 0) }),
    true, 'centripetal')
  return { sample, leadLen, circ, ring, length: leadLen, cx, cy, r }
}
