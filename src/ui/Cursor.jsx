import { useEffect, useRef } from 'react'
import { useStore } from '../store'

// Soft dot + trailing ring. Ring blooms over interactive things.
export default function Cursor() {
  const dot = useRef()
  const ring = useRef()
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf
    const move = (e) => {
      x = e.clientX
      y = e.clientY
      const el = e.target.closest?.('button, a, [data-hover]')
      document.body.classList.toggle('cursor-ui', !!el)
    }
    const loop = () => {
      rx += (x - rx) * 0.18
      ry += (y - ry) * 0.18
      if (dot.current) dot.current.style.transform = `translate(${x}px, ${y}px)`
      if (ring.current) ring.current.style.transform = `translate(${rx}px, ${ry}px)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', move)
    loop()
    return () => {
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
    }
  }, [])
  const hovered = useStore((s) => s.hovered)
  return (
    <div className={`cursor ${hovered ? 'hot' : ''}`} aria-hidden>
      <div ref={ring} className="cursor-ring"><span /></div>
      <div ref={dot} className="cursor-dot"><span /></div>
    </div>
  )
}
