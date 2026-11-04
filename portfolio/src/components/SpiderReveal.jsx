import { useEffect, useRef } from 'react'
import gsap from 'gsap'

const MAX_RADIUS = 170

// Dua foto ditumpuk. Lingkaran mask di sekitar kursor menampilkan foto kedua.
export default function SpiderReveal({ base, alt, label }) {
  const wrap = useRef(null)
  const layer = useRef(null)
  const ring = useRef(null)

  useEffect(() => {
    const el = wrap.current
    const top = layer.current
    const ringEl = ring.current
    const s = { x: 0, y: 0, r: 0 }

    const apply = () => {
      const mask =
        s.r < 1
          ? 'linear-gradient(transparent, transparent)'
          : `radial-gradient(circle ${s.r}px at ${s.x}px ${s.y}px, #000 0%, #000 58%, transparent 100%)`
      top.style.webkitMaskImage = mask
      top.style.maskImage = mask

      ringEl.style.width = ringEl.style.height = `${s.r * 2}px`
      ringEl.style.transform = `translate(${s.x - s.r}px, ${s.y - s.r}px)`
      ringEl.style.opacity = String(Math.min(1, s.r / MAX_RADIUS))
    }

    const local = (e) => {
      const b = el.getBoundingClientRect()
      return { x: e.clientX - b.left, y: e.clientY - b.top }
    }

    const onEnter = (e) => {
      const p = local(e)
      s.x = p.x
      s.y = p.y
      gsap.to(s, { r: MAX_RADIUS, duration: 0.45, ease: 'power3.out', onUpdate: apply })
    }
    const onMove = (e) => {
      const p = local(e)
      gsap.to(s, { x: p.x, y: p.y, duration: 0.22, ease: 'power3.out', overwrite: 'auto', onUpdate: apply })
    }
    const onLeave = () => {
      gsap.to(s, { r: 0, duration: 0.4, ease: 'power3.in', onUpdate: apply })
    }

    apply()
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('pointercancel', onLeave)
    return () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointercancel', onLeave)
      gsap.killTweensOf(s)
    }
  }, [])

  return (
    <div className="reveal" ref={wrap}>
      {/* Tumpukan foto dibungkus supaya tepi bawahnya bisa memudar halus */}
      <div className="reveal-stack">
        <img className="reveal-base" src={base} alt={label} draggable={false} />
        <img ref={layer} className="reveal-top" src={alt} alt="" aria-hidden="true" draggable={false} />
      </div>
      <div ref={ring} className="reveal-ring" aria-hidden="true" />
    </div>
  )
}
