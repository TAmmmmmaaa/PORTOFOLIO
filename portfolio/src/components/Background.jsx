import { useEffect, useRef } from 'react'
import { createStorm } from '../lib/bg/storm'
import { createGalaxy } from '../lib/bg/galaxy'

// Latar hidup satu layar penuh. Mode dark = badai malam dengan petir merah,
// mode light = langit galaxy hangat. Animasi berhenti saat tab tersembunyi, dan kalau
// perangkat terasa berat, efeknya otomatis dikurangi. Dengan "kurangi gerakan" aktif, hanya gambar diam.
export default function Background({ theme }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d', { alpha: false })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches
    const dprCap = mobile ? 1 : 1.5

    const scene = (theme === 'light' ? createGalaxy : createStorm)({ ctx, mobile, reduce })
    let w = 0
    let h = 0
    let raf = 0
    let last = 0
    let slow = 0

    const size = (force) => {
      const nw = window.innerWidth
      const nh = window.innerHeight
      // Di HP, bilah alamat yang muncul/hilang mengubah tinggi sedikit: abaikan supaya adegan tidak diulang.
      if (!force && Math.abs(nw - w) < 2 && Math.abs(nh - h) < 160) return
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
      w = nw
      h = nh
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      scene.resize(w, h)
      if (reduce) scene.draw(0, 0)
    }

    const frame = (now) => {
      const t = now / 1000
      const dt = Math.min(t - last || 0, 0.05)
      last = t
      scene.draw(t, dt)
      // Kalau frame terus lambat (~di bawah 30 fps), kurangi efek sekali saja.
      if (dt > 0.034) slow += 1
      else slow = Math.max(0, slow - 1)
      if (slow > 90 && scene.lowPower) {
        scene.lowPower()
        slow = -1e9
      }
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      if (reduce) return
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    }

    // Fade-in halus saat tema berganti.
    canvas.style.transition = 'none'
    canvas.style.opacity = '0'
    void canvas.offsetWidth
    canvas.style.transition = ''
    canvas.style.opacity = '1'

    size(true)
    if (!reduce) raf = requestAnimationFrame(frame)
    const onResize = () => size(false)
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [theme])

  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />
}
