import { useCallback, useEffect, useState } from 'react'

// Tema disimpan di atribut data-theme pada <html>. Nilai awalnya sudah dipasang oleh skrip
// kecil di index.html (sebelum halaman tampil, jadi tidak ada kedipan terang/gelap).
const KEY = 'tama-theme'
const THEME_COLOR = { dark: '#050203', light: '#ffb9a6' }

const systemTheme = () =>
  window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'

function stored() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function apply(theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[theme])
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || stored() || systemTheme())

  // Selama pengunjung belum memilih sendiri, ikuti pengaturan HP/laptop (termasuk saat berubah).
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      if (stored()) return
      const next = mq.matches ? 'light' : 'dark'
      apply(next)
      setTheme(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
    const root = document.documentElement
    root.classList.add('theme-anim')
    window.setTimeout(() => root.classList.remove('theme-anim'), 750)
    apply(next)
    setTheme(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* penyimpanan diblokir: tema tetap berganti, hanya tidak diingat */
    }
  }, [])

  return [theme, toggle]
}
