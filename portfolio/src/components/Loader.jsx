import { useEffect, useRef, useState } from 'react'
import { profile } from '../config'
import { getLoadState, subscribeLoad } from '../lib/loadState'

// Bobot tiap tahap (total 1). Persen yang tampil mengikuti kemajuan nyata:
// gambar, kode kartu 3D, tekstur kartu, lalu scene 3D siap merender.
const W = { imgs: 0.5, chunk: 0.15, cards: 0.1, scene: 0.25 }
const FAILSAFE_MS = 15000 // kalau ada aset macet, tetap lanjut supaya web tidak tertahan

const ASSETS = [
  profile.images.photo,
  profile.images.photoAlt,
  profile.images.cardFront,
  profile.images.cardBack,
].filter(Boolean)

export default function Loader({ onReady }) {
  const [pct, setPct] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  const parts = useRef({ imgs: new Set(), chunk: 0 })
  const target = useRef(0)

  // Kunci scroll selama loading, dan lepas begitu layar loading mulai memudar.
  useEffect(() => {
    if (leaving) return undefined
    const el = document.documentElement
    const prev = el.style.overflow
    el.style.overflow = 'hidden'
    return () => {
      el.style.overflow = prev
    }
  }, [leaving])

  useEffect(() => {
    const recompute = () => {
      const ls = getLoadState()
      target.current = Math.min(
        1,
        (parts.current.imgs.size / ASSETS.length) * W.imgs +
          parts.current.chunk * W.chunk +
          (ls.cards / 2) * W.cards +
          (ls.scene ? W.scene : 0),
      )
    }

    // 1) Gambar
    ASSETS.forEach((src) => {
      const img = new Image()
      img.onload = img.onerror = () => {
        parts.current.imgs.add(src) // Set, supaya mode dev (efek dobel) tidak menghitung dua kali
        recompute()
      }
      img.src = src
    })

    // 2) Kode kartu 3D (Three.js + fisika)
    import('./Lanyard')
      .catch(() => {})
      .finally(() => {
        parts.current.chunk = 1
        recompute()
      })

    // 3) Tekstur kartu + scene 3D dilaporkan Lanyard
    const unsub = subscribeLoad(recompute)
    const failsafe = setTimeout(() => {
      target.current = 1
    }, FAILSAFE_MS)
    recompute()
    return () => {
      unsub()
      clearTimeout(failsafe)
    }
  }, [])

  // Angka naik halus menuju target, dan baru sampai 100 kalau semuanya siap.
  useEffect(() => {
    let raf
    let shown = 0
    const tick = () => {
      shown = Math.min(100, shown + Math.max(0.3, (target.current * 100 - shown) * 0.08))
      shown = Math.min(shown, target.current * 100)
      setPct(Math.floor(shown + 0.0001))
      if (shown >= 100) {
        setPct(100)
        setTimeout(() => {
          setLeaving(true)
          onReady?.()
          setTimeout(() => setGone(true), 700)
        }, 350)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (gone) return null

  return (
    <div
      className={`loader${leaving ? ' is-leaving' : ''}`}
      role="progressbar"
      aria-label="Memuat aset"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="loader-inner">
        <p className="loader-label">MEMUAT ASET</p>
        <p className="loader-pct">
          {pct}
          <span>%</span>
        </p>
        <div className="loader-track">
          <div className="loader-fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <p className="loader-name">{profile.name}</p>
      </div>
    </div>
  )
}
