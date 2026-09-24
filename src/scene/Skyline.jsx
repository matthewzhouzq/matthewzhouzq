import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/*
  The view out of a Plateau apartment at night.
  Four painted layers sit at real distances behind the window glass and a
  shader ray-casts onto each one, so the city shifts with true parallax as
  the camera drifts:
    near     — triplexes across the street, with outdoor stairs (16 m)
    rooftops — flat roofs and low apartment blocks (150 m)
    downtown — the office towers (1.4 km)
    mountain — Mount Royal and its lit cross (2.5 km)
  All distances and sizes are in metres, relative to the window's centre (≈ eye level).
*/

function rng(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

// Draws into a canvas using metre coordinates: x ∈ [0, P), y ∈ [y0, y0 + H]
function layerCanvas(P, y0, H, pxPerM, draw) {
  const c = document.createElement('canvas')
  c.width = Math.round(P * pxPerM)
  c.height = Math.round(H * pxPerM)
  const g = c.getContext('2d')
  const X = (x) => x * pxPerM
  const Y = (y) => (y0 + H - y) * pxPerM
  const S = (m) => m * pxPerM
  draw(g, { X, Y, S, P, pxPerM })
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  t.anisotropy = 8
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}

const WARM = ['#ffcf8a', '#ffc27a', '#ffd9a0', '#f5b86b']
const COOL = ['#cfe0ff', '#b9d0ff']
const TV = '#8fb1ff'

function litWindow(r) {
  const v = r()
  if (v < 0.5) return null
  if (v < 0.9) return WARM[Math.floor(r() * WARM.length)]
  if (v < 0.96) return TV
  return COOL[Math.floor(r() * COOL.length)]
}

// ── near: Plateau triplexes, 3 storeys, brick, iron balconies, exterior stairs
const NEAR = { d: 16, P: 44, y0: -12, H: 12.5 }
function paintNear(g, { X, Y, S, P }) {
  const r = rng(7)
  // we're up on the top floor, so the roofs across the street sit just below eye level
  const street = -11.4
  let x = 0
  while (x < P) {
    const w = 6 + Math.floor(r() * 3)
    const top = street + 9.9 + r() * 1.1
    const brick = ['#2a1b17', '#241815', '#2d201a', '#1f1916'][Math.floor(r() * 4)]
    // facade
    g.fillStyle = brick
    g.fillRect(X(x), Y(top), S(w), S(top - street))
    // brick courses
    g.globalAlpha = 0.12
    g.fillStyle = '#000'
    for (let y = street; y < top; y += 0.075) g.fillRect(X(x), Y(y), S(w), 1)
    g.globalAlpha = 1
    // cornice + parapet
    g.fillStyle = '#120e0d'
    g.fillRect(X(x - 0.15), Y(top + 0.45), S(w + 0.3), S(0.45))
    g.fillStyle = '#0d0a0a'
    for (let bx = x + 0.3; bx < x + w - 0.2; bx += 0.5) g.fillRect(X(bx), Y(top), S(0.2), S(0.25))
    // floors
    const floors = [street + 0.4, street + 3.6, street + 6.8]
    floors.forEach((fy, fi) => {
      const n = w > 7 ? 3 : 2
      for (let i = 0; i < n; i++) {
        const wx = x + 0.7 + i * ((w - 1.4) / n) + 0.25
        const ww = (w - 1.4) / n - 0.5
        const wy = fy + 0.9
        const lit = litWindow(r)
        // frame
        g.fillStyle = '#0c0a0a'
        g.fillRect(X(wx - 0.08), Y(wy + 1.9), S(ww + 0.16), S(2.0))
        if (lit) {
          const grd = g.createLinearGradient(0, Y(wy + 1.8), 0, Y(wy))
          grd.addColorStop(0, lit)
          grd.addColorStop(1, lit === TV ? '#3a4f80' : '#b8763e')
          g.fillStyle = grd
        } else g.fillStyle = '#0a0d14'
        g.fillRect(X(wx), Y(wy + 1.8), S(ww), S(1.8))
        // mullion + a curtain on some
        g.fillStyle = '#0c0a0a'
        g.fillRect(X(wx + ww / 2 - 0.03), Y(wy + 1.8), S(0.06), S(1.8))
        if (lit && r() < 0.4) {
          g.globalAlpha = 0.55
          g.fillStyle = '#5a3a26'
          g.fillRect(X(wx), Y(wy + 1.8), S(ww * 0.3), S(1.8))
          g.globalAlpha = 1
        }
        // stone lintel
        g.fillStyle = '#3a302a'
        g.fillRect(X(wx - 0.12), Y(wy + 2.02), S(ww + 0.24), S(0.14))
      }
      // iron balcony on upper floors
      if (fi > 0) {
        const by = fy - 0.05
        g.fillStyle = '#070606'
        g.fillRect(X(x + 0.2), Y(by + 0.12), S(w - 0.4), S(0.12))
        g.fillRect(X(x + 0.2), Y(by + 1.05), S(w - 0.4), S(0.06))
        for (let bx = x + 0.25; bx < x + w - 0.2; bx += 0.14) g.fillRect(X(bx), Y(by + 1.05), Math.max(1, S(0.03)), S(0.95))
      }
    })
    // Montreal's outdoor staircase: a curving run from the 2nd-floor balcony down to the street
    if (r() < 0.75) {
      const sx = x + w * (r() < 0.5 ? 0.25 : 0.7)
      g.strokeStyle = '#060505'
      g.lineWidth = S(0.07)
      ;[0, 0.9].forEach((off) => {
        g.beginPath()
        g.moveTo(X(sx + off), Y(street + 3.6))
        g.bezierCurveTo(X(sx + off + 1.8), Y(street + 2.6), X(sx + off - 1.4), Y(street + 1.2), X(sx + off + 0.6), Y(street))
        g.stroke()
      })
      g.lineWidth = Math.max(1, S(0.035))
      for (let k = 0; k <= 16; k++) {
        const t = k / 16
        const bez = (a, b, c, d) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d
        const px = bez(sx, sx + 1.8, sx - 1.4, sx + 0.6)
        const py = bez(street + 3.6, street + 2.6, street + 1.2, street)
        g.beginPath()
        g.moveTo(X(px), Y(py))
        g.lineTo(X(px + 0.9), Y(py))
        g.stroke()
      }
    }
    // thin gap between buildings
    g.fillStyle = '#050506'
    g.fillRect(X(x + w - 0.05), Y(top + 0.5), S(0.1), S(top - street + 0.5))
    x += w
  }
  // street lamps (the orange sodium kind) along the sidewalk
  for (let lx = 5; lx < P; lx += 22) {
    g.fillStyle = '#0a0a0b'
    const ly = street + 6
    g.fillRect(X(lx), Y(ly), S(0.12), S(6))
    g.fillRect(X(lx - 0.9), Y(ly + 0.1), S(1.0), S(0.12))
    const glow = g.createRadialGradient(X(lx - 0.8), Y(ly - 0.1), 0, X(lx - 0.8), Y(ly - 0.1), S(3.2))
    glow.addColorStop(0, 'rgba(255,190,110,0.95)')
    glow.addColorStop(0.08, 'rgba(255,170,90,0.55)')
    glow.addColorStop(1, 'rgba(255,150,70,0)')
    g.fillStyle = glow
    g.fillRect(X(lx - 4.5), Y(ly + 3.4), S(7.5), S(7))
    // canopy of a street tree catching the light
    g.fillStyle = 'rgba(12,20,14,0.92)'
    for (let k = 0; k < 18; k++) {
      g.beginPath()
      g.arc(X(lx + 6 + (r() - 0.5) * 4), Y(street + 4.2 + (r() - 0.3) * 2.2), S(0.45 + r() * 0.6), 0, Math.PI * 2)
      g.fill()
    }
  }
}

// ── rooftops: flat roofs, a few 8–12 storey blocks, water tanks, antennas
const ROOF = { d: 150, P: 700, y0: -45, H: 90 }
function paintRoofs(g, { X, Y, S, P }) {
  const r = rng(21)
  let x = 0
  while (x < P) {
    const tall = r() < 0.18
    const w = tall ? 18 + r() * 20 : 10 + r() * 25
    const top = tall ? 2 + r() * 22 : -34 + r() * 14
    g.fillStyle = tall ? '#0e1119' : '#0b0d13'
    g.fillRect(X(x), Y(top), S(w), S(top + 45))
    // windows
    const fh = 3.1
    for (let fy = -44; fy < top - 1.5; fy += fh)
      for (let wx = x + 1; wx < x + w - 1.2; wx += 2.2) {
        const lit = r() < (tall ? 0.28 : 0.2) ? WARM[Math.floor(r() * WARM.length)] : null
        if (!lit) continue
        g.globalAlpha = 0.55 + r() * 0.45
        g.fillStyle = lit
        g.fillRect(X(wx), Y(fy + 1.9), Math.max(1, S(1.1)), Math.max(1, S(1.4)))
      }
    g.globalAlpha = 1
    // rooftop clutter
    if (!tall && r() < 0.35) {
      g.fillStyle = '#07080c'
      g.fillRect(X(x + w * 0.3), Y(top + 3), S(3), S(3))
    }
    if (r() < 0.25) {
      g.fillStyle = '#07080c'
      g.fillRect(X(x + w * 0.7), Y(top + 6), Math.max(1, S(0.25)), S(6))
      g.fillStyle = '#ff3b30'
      g.fillRect(X(x + w * 0.7 - 0.3), Y(top + 6.3), Math.max(2, S(0.6)), Math.max(2, S(0.6)))
    }
    x += w + (r() < 0.3 ? 2 + r() * 6 : 0)
  }
}

// ── downtown towers (≈ 1.4 km away), clustered where the window looks
const DOWNTOWN = { d: 1400, P: 1600, y0: -120, H: 400 }
function paintDowntown(g, { X, Y, S }) {
  const r = rng(99)
  const towers = [
    { x: 670, w: 42, h: 120 },
    { x: 715, w: 30, h: 150 },
    { x: 752, w: 48, h: 188, beacon: true }, // flat-topped, with rotating beacons
    { x: 806, w: 34, h: 215, pyramid: true }, // copper pyramid crown
    { x: 846, w: 40, h: 176, stepped: true },
    { x: 892, w: 28, h: 140 },
    { x: 924, w: 46, h: 196, notch: true },
    { x: 976, w: 36, h: 130 },
    { x: 1016, w: 30, h: 160 },
    { x: 1050, w: 44, h: 110 },
    { x: 620, w: 36, h: 95 },
    { x: 1100, w: 40, h: 85 },
  ]
  const base = -110
  towers.forEach((t) => {
    const top = base + t.h
    g.fillStyle = '#10131d'
    g.fillRect(X(t.x), Y(top), S(t.w), S(t.h))
    // lit office floors: rows of tiny lights, some floors fully on
    for (let fy = base + 4; fy < top - 3; fy += 4) {
      const floorOn = r() < 0.12
      for (let wx = t.x + 1.5; wx < t.x + t.w - 1.5; wx += 2.4) {
        if (!(floorOn || r() < 0.16)) continue
        g.globalAlpha = 0.45 + r() * 0.5
        g.fillStyle = r() < 0.7 ? '#dfe8ff' : '#ffd9a0'
        g.fillRect(X(wx), Y(fy + 1.4), Math.max(1, S(1.3)), Math.max(1, S(1.2)))
      }
    }
    g.globalAlpha = 1
    if (t.pyramid) {
      g.fillStyle = '#1c2b2a'
      g.beginPath()
      g.moveTo(X(t.x), Y(top))
      g.lineTo(X(t.x + t.w / 2), Y(top + 34))
      g.lineTo(X(t.x + t.w), Y(top))
      g.fill()
      g.strokeStyle = 'rgba(160,220,200,0.35)'
      g.lineWidth = Math.max(1, S(0.8))
      g.stroke()
    }
    if (t.stepped) {
      g.fillStyle = '#10131d'
      g.fillRect(X(t.x + 6), Y(top + 10), S(t.w - 12), S(10))
      g.fillRect(X(t.x + 13), Y(top + 18), S(t.w - 26), S(8))
    }
    if (t.notch) {
      g.fillStyle = '#10131d'
      g.fillRect(X(t.x + 10), Y(top + 14), S(t.w - 20), S(14))
    }
    // aircraft warning lights
    g.fillStyle = '#ff4a3a'
    g.fillRect(X(t.x + t.w / 2 - 1), Y(top + (t.pyramid ? 34 : t.stepped ? 26 : 2)), Math.max(2, S(2)), Math.max(2, S(2)))
  })
}

// ── Mount Royal and the illuminated cross (≈ 2.5 km)
const MOUNTAIN = { d: 2500, P: 5000, y0: -250, H: 560 }
function paintMountain(g, { X, Y, S, P }) {
  const peak = 1520
  g.fillStyle = '#0b0f14'
  g.beginPath()
  g.moveTo(X(0), Y(-250))
  for (let x = 0; x <= P; x += 10) {
    const dx = (x - peak) / 700
    const hump = 150 * Math.exp(-dx * dx) + 18 * Math.sin(x / 90) * Math.exp(-dx * dx * 0.5)
    g.lineTo(X(x), Y(-60 + hump))
  }
  g.lineTo(X(P), Y(-250))
  g.closePath()
  g.fill()
  // soft city glow sitting on the treeline
  const grd = g.createLinearGradient(0, Y(60), 0, Y(-120))
  grd.addColorStop(0, 'rgba(60,45,40,0)')
  grd.addColorStop(1, 'rgba(90,60,45,0.35)')
  g.fillStyle = grd
  g.fillRect(0, Y(60), X(P), S(180))
  // the cross on the summit
  const cx = peak, cy = -60 + 150 + 17
  const glow = g.createRadialGradient(X(cx), Y(cy + 22), 0, X(cx), Y(cy + 22), S(70))
  glow.addColorStop(0, 'rgba(235,240,255,0.55)')
  glow.addColorStop(1, 'rgba(235,240,255,0)')
  g.fillStyle = glow
  g.fillRect(X(cx - 80), Y(cy + 100), S(160), S(160))
  g.fillStyle = '#f4f6ff'
  g.fillRect(X(cx - 2.5), Y(cy + 52), S(5), S(52))
  g.fillRect(X(cx - 13), Y(cy + 40), S(26), S(4.5))
  // antenna tower on the other summit
  g.fillStyle = '#0b0f14'
  g.fillRect(X(peak + 520), Y(40), S(3), S(90))
  g.fillStyle = '#ff4a3a'
  g.fillRect(X(peak + 519), Y(42), Math.max(2, S(5)), Math.max(2, S(5)))
}

const LAYERS = [
  [MOUNTAIN, paintMountain, 0.8],
  [DOWNTOWN, paintDowntown, 2.5],
  [ROOF, paintRoofs, 5.5],
  [NEAR, paintNear, 46],
]

const vert = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vCam;
  void main() {
    vPos = position;
    vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const frag = /* glsl */ `
  uniform sampler2D uL[4];
  uniform vec4 uGeo[4]; // d, P, y0, H
  uniform float uTime;
  uniform vec2 uBeacon; // downtown beacon position (x, y) in metres
  varying vec3 vPos;
  varying vec3 vCam;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  vec4 layer(sampler2D t, vec4 g, vec3 dir, out vec2 p) {
    float k = g.x / -dir.z;
    p = vPos.xy + dir.xy * k;
    float v = (p.y - g.z) / g.w;
    if (v < 0.0 || v > 1.0) return vec4(0.0);
    return texture2D(t, vec2(p.x / g.y, v));
  }

  void main() {
    vec3 dir = normalize(vPos - vCam);
    if (dir.z > -0.001) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

    // night sky: deep blue overhead, sodium-orange light pollution at the horizon
    float el = dir.y;
    vec3 sky = mix(vec3(0.12, 0.085, 0.075), vec3(0.03, 0.045, 0.085), smoothstep(-0.05, 0.28, el));
    sky = mix(sky, vec3(0.012, 0.018, 0.04), smoothstep(0.28, 0.8, el));
    vec2 sp = floor(dir.xy / -dir.z * 240.0);
    float star = step(0.9975, hash(sp)) * smoothstep(0.12, 0.4, el);
    sky += star * 0.35 * (0.6 + 0.4 * sin(uTime * 2.0 + hash(sp) * 30.0));
    vec3 col = sky;

    vec2 p;
    vec4 c;
    c = layer(uL[0], uGeo[0], dir, p); col = mix(col, c.rgb, c.a);
    c = layer(uL[1], uGeo[1], dir, p); col = mix(col, c.rgb, c.a);
    // rotating searchlight beams from the flat-topped tower
    vec2 b = p - uBeacon;
    for (int i = 0; i < 2; i++) {
      float a = uTime * 0.55 + float(i) * 3.14159;
      float len = 900.0 * cos(a);
      float along = b.x / len;
      float beam = step(0.0, along) * step(along, 1.0) * exp(-abs(b.y - 2.0 - b.x * 0.02) / (2.5 + abs(b.x) * 0.01));
      col += vec3(0.75, 0.8, 1.0) * beam * 0.22 * (1.0 - along) * step(0.0, b.y + 8.0);
    }
    c = layer(uL[2], uGeo[2], dir, p); col = mix(col, c.rgb, c.a);
    c = layer(uL[3], uGeo[3], dir, p); col = mix(col, c.rgb, c.a);

    // a little haze between us and the far layers, then the glass itself
    col *= 0.92;
    float edge = smoothstep(0.0, 0.08, 0.55 - abs(vPos.x)) * smoothstep(0.0, 0.08, 0.95 - abs(vPos.y));
    col *= mix(0.7, 1.0, edge);
    gl_FragColor = vec4(col, 1.0);
  }
`

export default function Skyline({ width = 1.1, height = 1.9 }) {
  const material = useMemo(() => {
    const textures = LAYERS.map(([L, paint, ppm]) => layerCanvas(L.P, L.y0, L.H, ppm, paint))
    return new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uL: { value: textures },
        uGeo: { value: LAYERS.map(([L]) => new THREE.Vector4(L.d, L.P, L.y0, L.H)) },
        uTime: { value: 0 },
        uBeacon: { value: new THREE.Vector2(752 + 24, -110 + 188 + 2) },
      },
      toneMapped: false,
    })
  }, [])

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh material={material}>
      <planeGeometry args={[width, height]} />
    </mesh>
  )
}
