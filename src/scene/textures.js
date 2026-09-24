import * as THREE from 'three'
import { PALETTE } from '../data'

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function tex(c, { srgb = true, repeat } = {}) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeat, repeat)
  }
  t.anisotropy = 8
  return t
}

const cache = {}
const once = (key, fn) => cache[key] || (cache[key] = fn())

// Low-pile carpet: fine speckle noise, used as color + bump
export const carpetTexture = () =>
  once('carpet', () => {
    const [c, g] = canvas(512, 512)
    const img = g.createImageData(512, 512)
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 110 + Math.random() * 90 + (Math.random() < 0.04 ? 40 : 0)
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n
      img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
    return tex(c, { srgb: false, repeat: 14 })
  })

// Subtle brushed / matte noise for the desk and walls
export const matteNoise = () =>
  once('matte', () => {
    const [c, g] = canvas(256, 256)
    const img = g.createImageData(256, 256)
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 200 + Math.random() * 55
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n
      img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
    return tex(c, { srgb: false, repeat: 4 })
  })

// MacBook desktop: palette wallpaper + a few "project" windows
export const laptopScreenTexture = () =>
  once('laptop', () => {
    const W = 1024, H = 640
    const [c, g] = canvas(W, H)
    const bg = g.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, PALETTE.pine)
    bg.addColorStop(0.55, PALETTE.ink)
    bg.addColorStop(1, PALETTE.plum)
    g.fillStyle = bg
    g.fillRect(0, 0, W, H)
    // soft leaf-shaped glows
    const glow = (x, y, r, col) => {
      const rg = g.createRadialGradient(x, y, 0, x, y, r)
      rg.addColorStop(0, col)
      rg.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = rg
      g.fillRect(0, 0, W, H)
    }
    glow(260, 470, 420, 'rgba(51,99,86,0.55)')
    glow(820, 140, 360, 'rgba(75,74,90,0.5)')
    // menu bar
    g.fillStyle = 'rgba(10,10,12,0.55)'
    g.fillRect(0, 0, W, 26)
    g.fillStyle = 'rgba(255,255,255,0.8)'
    g.font = '600 15px -apple-system, Helvetica, Arial'
    g.fillText('  Finder     File     Edit     View', 14, 18)
    g.textAlign = 'right'
    g.fillText('matthew.zhou', W - 18, 18)
    g.textAlign = 'left'
    // title
    g.fillStyle = 'rgba(255,255,255,0.92)'
    g.font = "300 64px 'Work Sans', Helvetica, Arial"
    g.fillText('projects', 70, 250)
    g.font = '400 20px monospace'
    g.fillStyle = 'rgba(255,255,255,0.5)'
    g.fillText('click to open  →', 74, 290)
    // stacked cards
    const cards = [PALETTE.teal, PALETTE.mist, '#5b4a63']
    cards.forEach((col, i) => {
      const x = 560 + i * 60, y = 190 + i * 40
      g.fillStyle = 'rgba(0,0,0,0.35)'
      g.fillRect(x + 8, y + 10, 300, 200)
      g.fillStyle = col
      g.fillRect(x, y, 300, 200)
      g.fillStyle = 'rgba(255,255,255,0.12)'
      g.fillRect(x, y, 300, 28)
      ;['#ff5f57', '#febc2e', '#28c840'].forEach((d, j) => {
        g.fillStyle = d
        g.beginPath()
        g.arc(x + 16 + j * 18, y + 14, 5, 0, Math.PI * 2)
        g.fill()
      })
    })
    // dock
    g.fillStyle = 'rgba(255,255,255,0.14)'
    g.beginPath()
    g.roundRect(W / 2 - 180, H - 62, 360, 50, 14)
    g.fill()
    const dockCols = ['#6b8f86', '#8a86a3', '#c9c3b8', '#4f6f93', '#a7766b', '#7c7a8d']
    dockCols.forEach((col, i) => {
      g.fillStyle = col
      g.beginPath()
      g.roundRect(W / 2 - 160 + i * 55, H - 55, 38, 38, 9)
      g.fill()
    })
    return tex(c)
  })

// Keyboard: key grid on dark aluminium
export const keyboardTexture = () =>
  once('keyboard', () => {
    const W = 512, H = 200
    const [c, g] = canvas(W, H)
    g.fillStyle = '#1b1c1f'
    g.fillRect(0, 0, W, H)
    const rows = [14, 14, 13, 12, 11]
    const kh = 30, gap = 6
    rows.forEach((n, r) => {
      const kw = (W - 20 - gap * (n - 1)) / n
      for (let i = 0; i < n; i++) {
        g.fillStyle = '#0b0b0d'
        g.beginPath()
        g.roundRect(10 + i * (kw + gap), 10 + r * (kh + gap), kw, kh, 4)
        g.fill()
      }
    })
    return tex(c)
  })

// iPhone lock screen with live time
export function drawPhoneScreen(ctxCanvas) {
  const c = ctxCanvas
  const g = c.getContext('2d')
  const W = c.width, H = c.height
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, PALETTE.plum)
  bg.addColorStop(0.6, PALETTE.pine)
  bg.addColorStop(1, PALETTE.ink)
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  const rg = g.createRadialGradient(W * 0.3, H * 0.75, 0, W * 0.3, H * 0.75, W)
  rg.addColorStop(0, 'rgba(51,99,86,0.8)')
  rg.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = rg
  g.fillRect(0, 0, W, H)
  const d = new Date()
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  g.fillStyle = 'rgba(255,255,255,0.95)'
  g.textAlign = 'center'
  g.font = '500 30px -apple-system, Helvetica, Arial'
  g.fillText(d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), W / 2, 150)
  g.font = '600 150px -apple-system, Helvetica, Arial'
  g.fillText(`${hh}:${mm}`, W / 2, 300)
  // notification
  g.fillStyle = 'rgba(255,255,255,0.16)'
  g.beginPath()
  g.roundRect(34, H * 0.62, W - 68, 110, 26)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.95)'
  g.textAlign = 'left'
  g.font = '600 28px -apple-system, Helvetica, Arial'
  g.fillText('Contacts', 64, H * 0.62 + 46)
  g.font = '400 26px -apple-system, Helvetica, Arial'
  g.fillStyle = 'rgba(255,255,255,0.75)'
  g.fillText('Tap to get in touch with Matthew', 64, H * 0.62 + 84)
  g.fillStyle = 'rgba(255,255,255,0.8)'
  g.beginPath()
  g.roundRect(W / 2 - 70, H - 30, 140, 8, 4)
  g.fill()
}

// Minimal clock dial
export const clockFaceTexture = () =>
  once('clockface', () => {
    const S = 512
    const [c, g] = canvas(S, S)
    g.fillStyle = '#e8e4dc'
    g.fillRect(0, 0, S, S)
    g.translate(S / 2, S / 2)
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2
      const major = i % 5 === 0
      g.save()
      g.rotate(a)
      g.fillStyle = major ? '#1d1e21' : '#8c8a86'
      g.fillRect(-(major ? 5 : 1.5), -S / 2 + 26, major ? 10 : 3, major ? 44 : 18)
      g.restore()
    }
    g.fillStyle = PALETTE.teal
    g.font = '500 22px monospace'
    g.textAlign = 'center'
    g.fillText('M·Z', 0, 90)
    return tex(c)
  })

// Night outside the window: deep blue gradient + blurred distant lights
export const nightTexture = () =>
  once('night', () => {
    const W = 256, H = 448
    const [c, g] = canvas(W, H)
    const bg = g.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#0d1220')
    bg.addColorStop(0.7, '#1c2436')
    bg.addColorStop(1, '#2a2f3c')
    g.fillStyle = bg
    g.fillRect(0, 0, W, H)
    g.filter = 'blur(3px)'
    for (let i = 0; i < 40; i++) {
      const warm = Math.random() < 0.6
      g.fillStyle = warm ? `rgba(255,190,120,${0.15 + Math.random() * 0.3})` : `rgba(160,190,255,${0.1 + Math.random() * 0.25})`
      g.beginPath()
      g.arc(Math.random() * W, H * 0.62 + Math.random() * H * 0.35, 1 + Math.random() * 3, 0, Math.PI * 2)
      g.fill()
    }
    g.filter = 'none'
    return tex(c)
  })

// ─────────────────────────────────────────────────────────────
//  Procedural surface maps (tileable value-noise fbm → color / roughness / normal)
// ─────────────────────────────────────────────────────────────

function makeNoise(period, seed = 1) {
  // periodic lattice so the texture tiles seamlessly
  const g = new Float32Array(period * period)
  let s = seed * 16807
  for (let i = 0; i < g.length; i++) {
    s = (s * 16807) % 2147483647
    g[i] = s / 2147483647
  }
  const at = (x, y) => g[((y % period + period) % period) * period + ((x % period + period) % period)]
  const fade = (t) => t * t * (3 - 2 * t)
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = fade(x - xi), yf = fade(y - yi)
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1)
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf
  }
}

// fbm height field in [0,1], size S, tileable
function fbm(S, { base = 4, octaves = 5, seed = 1, stretchX = 1 } = {}) {
  const out = new Float32Array(S * S)
  const layers = Array.from({ length: octaves }, (_, o) => {
    const p = base * 2 ** o
    return { n: makeNoise(p, seed + o * 31), p, amp: 0.5 ** o }
  })
  let norm = 0
  layers.forEach((l) => (norm += l.amp))
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let v = 0
      for (const l of layers) v += l.n((x / S) * l.p * stretchX, (y / S) * l.p) * l.amp
      out[y * S + x] = v / norm
    }
  return out
}

function heightToCanvas(h, S, map = (v) => [v * 255, v * 255, v * 255]) {
  const [c, g] = canvas(S, S)
  const img = g.createImageData(S, S)
  for (let i = 0; i < S * S; i++) {
    const [r, gg, b] = map(h[i], i)
    img.data[i * 4] = r
    img.data[i * 4 + 1] = gg
    img.data[i * 4 + 2] = b
    img.data[i * 4 + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return c
}

function heightToNormal(h, S, strength = 2) {
  const [c, g] = canvas(S, S)
  const img = g.createImageData(S, S)
  const H = (x, y) => h[((y + S) % S) * S + ((x + S) % S)]
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * S + x) * 4
      img.data[i] = (-dx / len * 0.5 + 0.5) * 255
      img.data[i + 1] = (dy / len * 0.5 + 0.5) * 255
      img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  g.putImageData(img, 0, 0)
  return c
}

const lin = (c, repeat) => tex(c, { srgb: false, repeat })
const srgb = (c, repeat) => tex(c, { repeat })

// Low-pile loop carpet: grey/black heather + tiny loops
export const carpetMaps = () =>
  once('carpetMaps', () => {
    const S = 512
    const low = fbm(S, { base: 3, octaves: 3, seed: 11 })
    const hi = fbm(S, { base: 64, octaves: 2, seed: 5 })
    const h = new Float32Array(S * S)
    for (let i = 0; i < h.length; i++) {
      const loop = Math.sin((i % S) * 1.6) * Math.sin(Math.floor(i / S) * 1.6) * 0.5 + 0.5
      h[i] = hi[i] * 0.65 + loop * 0.2 + Math.random() * 0.15
    }
    const color = heightToCanvas(h, S, (v, i) => {
      const t = 38 + low[i] * 22 + v * 34 + (Math.random() < 0.03 ? 18 : 0)
      return [t, t, t * 1.04]
    })
    return {
      map: srgb(color, 10),
      normalMap: lin(heightToNormal(h, S, 3), 10),
    }
  })

// Matte black lacquer with faint grain + wear in the roughness
export const deskMaps = () =>
  once('deskMaps', () => {
    const S = 512
    const grain = fbm(S, { base: 2, octaves: 6, seed: 23, stretchX: 0.08 })
    const smudge = fbm(S, { base: 3, octaves: 4, seed: 41 })
    const rough = heightToCanvas(grain, S, (v, i) => {
      const r = 120 + v * 70 + smudge[i] * 50
      return [r, r, r]
    })
    return {
      roughnessMap: lin(rough, 1),
      normalMap: lin(heightToNormal(grain, S, 1.2), 1),
    }
  })

// Painted plaster: soft, low-frequency unevenness
export const wallMaps = () =>
  once('wallMaps', () => {
    const S = 512
    const h = fbm(S, { base: 6, octaves: 6, seed: 77 })
    const color = heightToCanvas(h, S, (v) => {
      const t = 22 + v * 14
      return [t, t, t * 1.05]
    })
    return {
      map: srgb(color, 3),
      normalMap: lin(heightToNormal(h, S, 1.5), 3),
    }
  })

// Woven upholstery for the chair
export const fabricMaps = () =>
  once('fabricMaps', () => {
    const S = 256
    const n = fbm(S, { base: 16, octaves: 3, seed: 9 })
    const h = new Float32Array(S * S)
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        // basket weave: alternating over/under threads
        const cx = Math.floor(x / 8), cy = Math.floor(y / 8)
        const warp = (cx + cy) % 2 === 0
        const fx = (x % 8) / 8, fy = (y % 8) / 8
        const thread = warp ? Math.sin(fy * Math.PI) : Math.sin(fx * Math.PI)
        h[y * S + x] = thread * 0.7 + n[y * S + x] * 0.3
      }
    const color = heightToCanvas(h, S, (v, i) => {
      const t = 150 + v * 55 + (n[i] - 0.5) * 40
      return [t, t, t * 1.02]
    })
    return {
      map: srgb(color, 14),
      normalMap: lin(heightToNormal(h, S, 2.5), 14),
    }
  })

// Bead-blasted aluminium
export const aluMaps = () =>
  once('aluMaps', () => {
    const S = 256
    const h = fbm(S, { base: 32, octaves: 3, seed: 3 })
    return { roughnessMap: lin(heightToCanvas(h, S, (v) => [90 + v * 60, 90 + v * 60, 90 + v * 60]), 2) }
  })

// Classic alarm-clock dial: white face, minute track, Arabic numerals
export const alarmDialTexture = () =>
  once('alarmDial', () => {
    const S = 1024
    const [c, g] = canvas(S, S)
    const face = g.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S / 2)
    face.addColorStop(0, '#f6f4ef')
    face.addColorStop(1, '#e4e1da')
    g.fillStyle = face
    g.fillRect(0, 0, S, S)
    g.translate(S / 2, S / 2)
    const R = S / 2
    g.strokeStyle = '#1a1a1a'
    g.lineWidth = 3
    ;[0.9, 0.84].forEach((k) => {
      g.beginPath()
      g.arc(0, 0, R * k, 0, Math.PI * 2)
      g.stroke()
    })
    for (let i = 0; i < 60; i++) {
      g.save()
      g.rotate((i / 60) * Math.PI * 2)
      g.fillStyle = '#1a1a1a'
      const major = i % 5 === 0
      g.fillRect(-(major ? 4 : 1.8), -R * 0.9, major ? 8 : 3.6, R * (major ? 0.07 : 0.06))
      g.restore()
    }
    g.fillStyle = '#161616'
    g.font = `500 ${R * 0.17}px Georgia, 'Times New Roman', serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    for (let n = 1; n <= 12; n++) {
      const a = (n / 12) * Math.PI * 2
      g.fillText(String(n), Math.sin(a) * R * 0.68, -Math.cos(a) * R * 0.68)
    }
    return tex(c)
  })
