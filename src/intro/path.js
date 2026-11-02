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
