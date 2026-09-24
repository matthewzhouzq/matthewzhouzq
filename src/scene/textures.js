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
    g.font = '300 64px Georgia, serif'
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
