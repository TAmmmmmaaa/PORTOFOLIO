import * as THREE from 'three'

// Ukuran kartu dalam satuan dunia 3D. Rasio sama dengan gambar kartu 1024x1445.
export const CARD_W = 1.9
export const CARD_H = 2.68
export const CARD_T = 0.06
const BEVEL = 0.014

// Lubang gantungan sungguhan (bentuk kapsul). Pusatnya sedikit di bawah titik gantung
// supaya cincin bertumpu di tepi atas lubang, bukan melayang.
export const HOLE_W = 0.5
export const HOLE_H = 0.13
export const HOLE_CY = CARD_H / 2 - 0.125

const TEX_W = 1024
const TEX_H = Math.round((TEX_W * CARD_H) / CARD_W)

/* ---------- Geometri ---------- */

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function capsulePath(w, h, cy) {
  const p = new THREE.Path()
  const r = h / 2
  const x0 = -w / 2 + r
  const x1 = w / 2 - r
  p.moveTo(x0, cy - r)
  p.lineTo(x1, cy - r)
  p.absarc(x1, cy, r, -Math.PI / 2, Math.PI / 2, false)
  p.lineTo(x0, cy + r)
  p.absarc(x0, cy, r, Math.PI / 2, (Math.PI * 3) / 2, false)
  return p
}

// slab: badan kartu (tebal, tepi miring/bevel supaya menangkap cahaya). face: permukaan datar untuk tekstur.
export function createCardGeometries() {
  const shape = roundedRectShape(CARD_W - BEVEL * 2, CARD_H - BEVEL * 2, 0.12)
  shape.holes.push(capsulePath(HOLE_W, HOLE_H, HOLE_CY))

  const depth = CARD_T - BEVEL * 2
  const slab = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 3,
    curveSegments: 14,
  })
  slab.translate(0, 0, -depth / 2)

  const face = new THREE.ShapeGeometry(shape, 14)
  const pos = face.attributes.position
  const uv = face.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / CARD_W + 0.5, pos.getY(i) / CARD_H + 0.5)
  }
  uv.needsUpdate = true

  return { slab, face }
}

/* ---------- Gambar di canvas ---------- */

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function fitFont(ctx, text, maxWidth, size, weight, family) {
  let s = size
  while (s > 24) {
    ctx.font = `${weight} ${s}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) break
    s -= 2
  }
  return s
}

function drawFront(ctx, profile) {
  const w = TEX_W
  const h = TEX_H

  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#0a1230')
  bg.addColorStop(0.55, '#16327f')
  bg.addColorStop(1, '#080d24')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  for (let y = 40; y < h; y += 48) {
    for (let x = 40; x < w; x += 48) ctx.fillRect(x, y, 3, 3)
  }

  ctx.strokeStyle = 'rgba(255,107,107,0.55)'
  ctx.lineWidth = 6
  rr(ctx, 28, 28, w - 56, h - 56, 44)
  ctx.stroke()

  // Lubang gantungan
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  rr(ctx, w / 2 - 120, 44, 240, 46, 23)
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ff6b6b'
  ctx.font = '600 34px monospace'
  ctx.fillText('PORTFOLIO  •  ID', w / 2, 170)

  // Avatar placeholder
  const cx = w / 2
  const cy = 600
  const r = 250
  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  ring.addColorStop(0, '#ff6b6b')
  ring.addColorStop(1, '#ff3d71')
  ctx.lineWidth = 10
  ctx.strokeStyle = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r - 6, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.beginPath()
  ctx.arc(cx, cy - 40, 92, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx, cy + 215, 175, 140, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Nama dan peran
  ctx.fillStyle = '#ffffff'
  const nameSize = fitFont(ctx, profile.name, w - 160, 84, 800, 'sans-serif')
  ctx.font = `800 ${nameSize}px sans-serif`
  ctx.fillText(profile.name, w / 2, 1000)

  ctx.fillStyle = '#93b4ff'
  ctx.font = '600 44px monospace'
  ctx.fillText(profile.role, w / 2, 1075)

  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '500 26px monospace'
  ctx.fillText('ganti dengan public/card-front.webp', w / 2, h - 90)
}

function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function drawBack(ctx) {
  const w = TEX_W
  const h = TEX_H

  const bg = ctx.createLinearGradient(0, h, w, 0)
  bg.addColorStop(0, '#080d24')
  bg.addColorStop(1, '#16327f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(255,107,107,0.55)'
  ctx.lineWidth = 6
  rr(ctx, 28, 28, w - 56, h - 56, 44)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 72px sans-serif'
  ctx.fillText('CONNECT WITH ME', w / 2, 230)

  // Panel pola menyerupai QR (hanya hiasan placeholder, bukan QR sungguhan)
  const panel = 560
  const px = (w - panel) / 2
  const py = 330
  ctx.fillStyle = '#eef2ff'
  rr(ctx, px, py, panel, panel, 36)
  ctx.fill()

  const n = 25
  const pad = 36
  const cell = (panel - pad * 2) / n
  const rand = mulberry32(7)
  ctx.fillStyle = '#0b1230'
  const inFinder = (i, j) => (i < 8 && j < 8) || (i >= n - 8 && j < 8) || (i < 8 && j >= n - 8)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (inFinder(i, j)) continue
      if (rand() > 0.52) ctx.fillRect(px + pad + i * cell, py + pad + j * cell, cell + 0.5, cell + 0.5)
    }
  }
  const finder = (i0, j0) => {
    const x = px + pad + i0 * cell
    const y = py + pad + j0 * cell
    ctx.fillStyle = '#0b1230'
    ctx.fillRect(x, y, cell * 7, cell * 7)
    ctx.fillStyle = '#eef2ff'
    ctx.fillRect(x + cell, y + cell, cell * 5, cell * 5)
    ctx.fillStyle = '#0b1230'
    ctx.fillRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3)
  }
  finder(0, 0)
  finder(n - 7, 0)
  finder(0, n - 7)

  ctx.fillStyle = '#93b4ff'
  ctx.font = '600 34px monospace'
  ctx.fillText('SCAN ME', w / 2, 1010)

  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '500 26px monospace'
  ctx.fillText('QR placeholder: ganti dengan public/card-back.webp', w / 2, h - 90)
}

function drawCover(ctx, img) {
  const scale = Math.max(TEX_W / img.width, TEX_H / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (TEX_W - dw) / 2, (TEX_H - dh) / 2, dw, dh)
}

/* ---------- Tekstur ---------- */

// Mulai dengan desain placeholder. Kalau file di `url` ada, gambarnya menimpa placeholder.
export function createCardTexture(kind, url, profile, onReady) {
  const canvas = document.createElement('canvas')
  canvas.width = TEX_W
  canvas.height = TEX_H
  const ctx = canvas.getContext('2d')

  if (kind === 'front') drawFront(ctx, profile)
  else drawBack(ctx)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8

  if (url) {
    const img = new Image()
    img.onload = () => {
      drawCover(ctx, img)
      texture.needsUpdate = true
      onReady?.()
    }
    img.onerror = () => onReady?.() // file belum ada: tetap pakai placeholder
    img.src = url
  } else {
    onReady?.()
  }
  return texture
}

// Tekstur tali: hitam dengan garis merah, jahitan, dan teks berulang. Rasio 16:1.
export const BAND_ASPECT = 16

export function createBandTexture(label, sub = '') {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  ctx.fillStyle = '#0c0c10'
  ctx.fillRect(0, 0, w, h)

  // serat kain halus (anyaman)
  ctx.fillStyle = 'rgba(255,255,255,0.035)'
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1)
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  for (let x = 0; x < w; x += 3) ctx.fillRect(x, 0, 1, h)

  // pita merah di kedua tepi + garis putih tipis
  ctx.fillStyle = '#e11d27'
  ctx.fillRect(0, 0, w, 20)
  ctx.fillRect(0, h - 20, w, 20)
  ctx.fillStyle = '#f4f4f4'
  ctx.fillRect(0, 20, w, 3)
  ctx.fillRect(0, h - 23, w, 3)

  // jahitan putus-putus
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 2
  ctx.setLineDash([10, 8])
  ctx.beginPath()
  ctx.moveTo(0, 33)
  ctx.lineTo(w, 33)
  ctx.moveTo(0, h - 33)
  ctx.lineTo(w, h - 33)
  ctx.stroke()
  ctx.setLineDash([])

  // teks berulang; jumlah ulangan dibulatkan supaya ujung tekstur menyambung rapi
  ctx.textBaseline = 'middle'
  const text = label.toUpperCase()
  ctx.font = '800 50px Arial, Helvetica, sans-serif'
  const tw = ctx.measureText(text).width
  const unitRaw = tw + 90
  const repeats = Math.max(1, Math.round(w / unitRaw))
  const unit = w / repeats
  for (let n = 0; n < repeats; n++) {
    const x0 = n * unit + 30
    ctx.fillStyle = '#f4f4f4'
    ctx.textAlign = 'left'
    ctx.fillText(text, x0, h / 2 + 3)
    // belah ketupat merah sebagai pemisah
    const dx = x0 + tw + 38
    ctx.fillStyle = '#e11d27'
    ctx.beginPath()
    ctx.moveTo(dx, h / 2 - 12)
    ctx.lineTo(dx + 12, h / 2 + 3)
    ctx.lineTo(dx, h / 2 + 18)
    ctx.lineTo(dx - 12, h / 2 + 3)
    ctx.closePath()
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}

// Bump map anyaman untuk tali: bikin permukaan kain terasa berserat saat kena cahaya.
export function createBandBump() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let x = 0; x < canvas.width; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? '#b8b8b8' : '#4a4a4a'
    ctx.fillRect(x, 0, 2, canvas.height)
  }
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, y, canvas.width, 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}
