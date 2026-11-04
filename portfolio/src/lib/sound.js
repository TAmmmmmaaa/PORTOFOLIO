import { useSyncExternalStore } from 'react'

// Suara klik tombol. Pilihan aktif/nonaktif disimpan di browser pengunjung.
const KEY = 'tama-sound'
const SRC = '/sounds/click.mp3'

function readStored() {
  try {
    return localStorage.getItem(KEY) !== 'off' // bawaan: aktif
  } catch {
    return true
  }
}

let enabled = readStored()
let audio = null
const listeners = new Set()

function play() {
  try {
    if (!audio) {
      audio = new Audio(SRC)
      audio.preload = 'auto'
      audio.volume = 0.6
    }
    audio.currentTime = 0
    audio.play().catch(() => {})
  } catch {
    /* abaikan: audio tidak tersedia */
  }
}

export function setSoundEnabled(value) {
  enabled = value
  try {
    localStorage.setItem(KEY, value ? 'on' : 'off')
  } catch {
    /* abaikan: penyimpanan browser mati */
  }
  listeners.forEach((l) => l())
  if (value) play() // beri umpan balik saat dinyalakan
}

export function useSoundEnabled() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => enabled,
  )
}

// Pasang sekali: setiap klik pada tombol atau tautan membunyikan suara.
export function installClickSound() {
  const onClick = (e) => {
    if (!enabled) return
    const el = e.target.closest?.('button, a[href], [role="tab"]')
    if (!el || el.disabled || el.hasAttribute('data-no-click-sound')) return
    play()
  }
  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}
