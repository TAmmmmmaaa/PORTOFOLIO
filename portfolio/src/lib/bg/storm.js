// Mode dark: badai malam. Awan gelap bergerak berlapis, petir merah bercabang yang menerangi awan,
// hujan tipis, kabut merah di cakrawala, dan getaran kecil saat "gemuruh". Semua digambar di canvas 2D.
const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Awan dibuat dari banyak gumpalan kecil supaya tepinya bergelombang seperti awan kumulonimbus.
// Dikembalikan dua versi dengan bentuk yang sama: `base` (gelap) dan `lit` (merah terang, saat petir).
function makeCloud(width, height, tint) {
  const base = document.createElement('canvas')
  const lit = document.createElement('canvas')
  base.width = lit.width = width
  base.height = lit.height = height
  const g = base.getContext('2d')
  const l = lit.getContext('2d')
  // Sedikit blur supaya tepi gumpalan menyatu (diabaikan di browser yang tidak mendukung ctx.filter).
  g.filter = 'blur(1.2px)'
  l.filter = 'blur(1.2px)'

  const puffs = []
  const count = 150
  for (let i = 0; i < count; i++) {
    const nx = 0.06 + 0.88 * Math.random()
    const e = 1 - Math.pow(Math.abs(nx - 0.5) * 2, 1.5) // gumpalan lebih tinggi di tengah
    const r = height * (0.035 + 0.075 * Math.random()) * (0.6 + 0.6 * e)
    const py = height * (0.76 - 0.55 * e * Math.pow(Math.random(), 0.8))
    puffs.push([width * nx, Math.min(py, height * 0.82), r])
  }
  // badan awan yang lebar dan lembut supaya celah antar gumpalan terisi
  const body = [[0.5, 0.62, 0.3], [0.32, 0.68, 0.22], [0.68, 0.68, 0.22], [0.5, 0.5, 0.2]]
  for (const [bx, by, br] of body) puffs.unshift([width * bx, height * by, height * br])

  for (const [px, py, r] of puffs) {
    const gb = g.createRadialGradient(px, py - r * 0.25, r * 0.05, px, py, r)
    gb.addColorStop(0, `rgba(${tint[0] + 9},${tint[1] + 6},${tint[2] + 7},1)`)
    gb.addColorStop(0.72, `rgba(${tint[0]},${tint[1]},${tint[2]},0.9)`)
    gb.addColorStop(1, `rgba(${tint[0]},${tint[1]},${tint[2]},0)`)
    g.fillStyle = gb
    g.beginPath()
    g.arc(px, py, r, 0, Math.PI * 2)
    g.fill()

    const gl = l.createRadialGradient(px, py - r * 0.25, r * 0.05, px, py, r)
    gl.addColorStop(0, 'rgba(255,92,102,0.95)')
    gl.addColorStop(0.72, 'rgba(225,34,50,0.85)')
    gl.addColorStop(1, 'rgba(205,22,42,0)')
    l.fillStyle = gl
    l.beginPath()
    l.arc(px, py, r, 0, Math.PI * 2)
    l.fill()
  }

  // sisi atas sedikit lebih terang, sisi bawah lebih gelap (hanya di area yang berisi awan)
  g.filter = 'none'
  g.globalCompositeOperation = 'source-atop'
  const sh = g.createLinearGradient(0, height * 0.1, 0, height * 0.85)
  sh.addColorStop(0, 'rgba(150,90,100,0.2)')
  sh.addColorStop(0.5, 'rgba(0,0,0,0)')
  sh.addColorStop(1, 'rgba(0,0,0,0.4)')
  g.fillStyle = sh
  g.fillRect(0, 0, width, height)
  return { base, lit }
}

function buildBolt(w, h) {
  const x0 = rand(w * 0.1, w * 0.9)
  const y0 = rand(h * 0.12, h * 0.26)
  const x1 = x0 + rand(-w * 0.12, w * 0.12)
  const y1 = rand(h * 0.55, h * 0.93)
  const segs = []
  const jag = (ax, ay, bx, by, disp, depth) => {
    const len = Math.hypot(bx - ax, by - ay)
    if (len < 15) {
      segs.push([ax, ay, bx, by, depth])
      return
    }
    const nx = -(by - ay) / len
    const ny = (bx - ax) / len
    const o = (Math.random() - 0.5) * disp
    const px = (ax + bx) / 2 + nx * o
    const py = (ay + by) / 2 + ny * o
    jag(ax, ay, px, py, disp * 0.55, depth)
    jag(px, py, bx, by, disp * 0.55, depth)
  }
  jag(x0, y0, x1, y1, h * 0.14, 0)

  const main = segs.slice()
  let branches = 0
  for (let i = 4; i < main.length && branches < 6; i++) {
    if (Math.random() > 0.07) continue
    const [, , ox, oy] = main[i]
    const base = Math.atan2(main[i][3] - main[i][1], main[i][2] - main[i][0])
    const ang = base + (Math.random() < 0.5 ? -1 : 1) * rand(0.35, 0.85)
    const len = rand(h * 0.08, h * 0.26)
    const ex = ox + Math.cos(ang) * len
    const ey = oy + Math.max(0.2, Math.sin(ang)) * len
    jag(ox, oy, ex, ey, len * 0.45, 1)
    branches++
  }
  return { segs, x0, y0, x1, y1 }
}

// Pola kedip: petir menyala, meredup, menyala lagi, lalu padam.
function flickerPattern() {
  const times = [0, 0.06, 0.12, 0.2, 0.32, 0.5 + Math.random() * 0.25]
  const vals = [1, 0.3 + Math.random() * 0.2, 0.9 + Math.random() * 0.1, 0.4 + Math.random() * 0.2, 0.65, 0]
  return { times, vals }
}

function intensity(strike, t) {
  if (!strike) return 0
  const u = t - strike.born
  const { times, vals } = strike.pattern
  if (u < 0 || u >= times[times.length - 1]) return 0
  for (let i = 1; i < times.length; i++) {
    if (u < times[i]) {
      const k = (u - times[i - 1]) / (times[i] - times[i - 1])
      return vals[i - 1] + (vals[i] - vals[i - 1]) * k
    }
  }
  return 0
}

export function createStorm({ ctx, mobile, reduce }) {
  let w = 0
  let h = 0
  let layers = [[], [], []]
  let rain = []
  let vignette = null
  let litCanvas = null
  let litCtx = null
  let strike = null
  let nextStrike = 1.6
  let shake = 0
  let lowPower = false

  const LAYER = [
    { count: mobile ? 3 : 5, tint: [32, 19, 24], alpha: 0.7, speed: 5, y: [-0.03, 0.26], wMul: [0.8, 1.25] },
    { count: mobile ? 3 : 5, tint: [40, 24, 30], alpha: 0.86, speed: 11, y: [0.0, 0.32], wMul: [0.7, 1.05] },
    { count: mobile ? 2 : 4, tint: [20, 11, 14], alpha: 0.96, speed: 21, y: [-0.12, 0.18], wMul: [1.0, 1.6] },
  ]

  function build() {
    layers = LAYER.map((cfg) => {
      const sprites = [0, 1, 2].map(() => makeCloud(760, 300, cfg.tint))
      return Array.from({ length: cfg.count }, (_, i) => {
        const cw = clamp(w * rand(cfg.wMul[0], cfg.wMul[1]), 460, 2200)
        return {
          sp: sprites[i % 3],
          w: cw,
          h: cw * 0.395,
          x: -cw * 0.4 + (i / cfg.count) * (w + cw * 0.5) + rand(-60, 60),
          y: h * rand(cfg.y[0], cfg.y[1]),
          speed: cfg.speed * rand(0.8, 1.25),
          phase: rand(0, 6.28),
        }
      })
    })
    const n = reduce ? 0 : mobile ? 45 : 115
    rain = Array.from({ length: n }, () => ({
      x: rand(0, w + 60),
      y: rand(0, h),
      len: rand(12, 30),
      speed: rand(700, 1100),
      heavy: Math.random() < 0.35,
    }))
    litCanvas = document.createElement('canvas')
    litCanvas.width = Math.max(2, Math.ceil(w / 2))
    litCanvas.height = Math.max(2, Math.ceil(h / 2))
    litCtx = litCanvas.getContext('2d')
    // Vinyet gelap di tepi layar, digambar sekali.
    vignette = document.createElement('canvas')
    vignette.width = Math.max(2, Math.round(w / 4))
    vignette.height = Math.max(2, Math.round(h / 4))
    const g = vignette.getContext('2d')
    const grd = g.createRadialGradient(vignette.width / 2, vignette.height / 2, Math.min(vignette.width, vignette.height) * 0.3, vignette.width / 2, vignette.height / 2, Math.hypot(vignette.width, vignette.height) * 0.58)
    grd.addColorStop(0, 'rgba(0,0,0,0)')
    grd.addColorStop(1, 'rgba(0,0,0,0.6)')
    g.fillStyle = grd
    g.fillRect(0, 0, vignette.width, vignette.height)
  }

  function startStrike(t) {
    const sheet = Math.random() < 0.22
    strike = {
      born: t,
      sheet,
      pattern: flickerPattern(),
      bolt: sheet ? null : buildBolt(w, h),
      gx: 0,
      gy: 0,
    }
    strike.gx = sheet ? rand(w * 0.15, w * 0.85) : strike.bolt.x0
    strike.gy = sheet ? rand(h * 0.04, h * 0.2) : strike.bolt.y0
    shake = reduce ? 0 : sheet ? 0.35 : 1
    // Kadang menyambar dua kali beruntun.
    const double = !sheet && Math.random() < 0.28
    nextStrike = t + (double ? rand(0.7, 1.3) : rand(2.6, 6.8)) + strike.pattern.times[5]
  }

  function drawLayer(i, t) {
    ctx.globalAlpha = LAYER[i].alpha
    for (const c of layers[i]) {
      c.dy = c.y + Math.sin(t * 0.12 + c.phase) * 6
      ctx.drawImage(c.sp.base, c.x, c.dy, c.w, c.h)
    }
    ctx.globalAlpha = 1
  }

  // Cahaya petir menerangi awan di sekitar titik sambaran, dengan tepi yang memudar halus.
  function litPass(I) {
    const lc = litCtx
    lc.globalCompositeOperation = 'source-over'
    lc.clearRect(0, 0, litCanvas.width, litCanvas.height)
    for (let i = 0; i < 3; i++) {
      lc.globalAlpha = i === 2 ? 0.6 : 1
      for (const c of layers[i]) lc.drawImage(c.sp.lit, c.x / 2, (c.dy ?? c.y) / 2, c.w / 2, c.h / 2)
    }
    lc.globalAlpha = 1
    lc.globalCompositeOperation = 'destination-in'
    const gx = strike.gx / 2
    const gy = (strike.gy + h * 0.05) / 2
    const R = (Math.max(w, h) * (strike.sheet ? 0.4 : 0.3)) / 2
    const g = lc.createRadialGradient(gx, gy, 0, gx, gy, R)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(0.45, 'rgba(0,0,0,0.5)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    lc.fillStyle = g
    lc.fillRect(0, 0, litCanvas.width, litCanvas.height)
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(1, I * 0.8)
    ctx.drawImage(litCanvas, 0, 0, w, h)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  function drawBolt(I) {
    const { segs, x0, y0, x1, y1 } = strike.bolt
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    const passes = [
      [26, 12, `rgba(255,15,40,${0.1 * I})`],
      [11, 5.5, `rgba(255,45,60,${0.38 * I})`],
      [3.6, 1.8, `rgba(255,205,210,${I})`],
    ]
    for (const [wMain, wBranch, color] of passes) {
      ctx.strokeStyle = color
      for (const depth of [0, 1]) {
        ctx.lineWidth = depth === 0 ? wMain : wBranch
        ctx.beginPath()
        for (const s of segs) {
          if ((s[4] === 0) !== (depth === 0)) continue
          ctx.moveTo(s[0], s[1])
          ctx.lineTo(s[2], s[3])
        }
        ctx.stroke()
      }
    }
    // Cahaya merah lebar di sepanjang jalur petir.
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2
    const wr = Math.max(w, h) * 0.38
    const wg = ctx.createRadialGradient(mx, my, 0, mx, my, wr)
    wg.addColorStop(0, `rgba(255,40,55,${0.2 * I})`)
    wg.addColorStop(1, 'rgba(255,30,45,0)')
    ctx.fillStyle = wg
    ctx.fillRect(mx - wr, my - wr, wr * 2, wr * 2)
    // Cahaya benturan di ujung petir.
    const r = Math.max(w, h) * 0.12
    const g = ctx.createRadialGradient(x1, y1, 0, x1, y1, r)
    g.addColorStop(0, `rgba(255,70,80,${0.5 * I})`)
    g.addColorStop(1, 'rgba(255,40,50,0)')
    ctx.fillStyle = g
    ctx.fillRect(x1 - r, y1 - r, r * 2, r * 2)
    ctx.globalCompositeOperation = 'source-over'
  }

  return {
    resize(nw, nh) {
      w = nw
      h = nh
      build()
    },
    lowPower() {
      lowPower = true
      rain = rain.slice(0, Math.floor(rain.length / 2))
    },
    draw(t, dt) {
      // --- update ---
      if (!reduce) {
        if (t >= nextStrike) startStrike(t)
        for (const layer of layers) {
          for (const c of layer) {
            c.x += c.speed * dt
            if (c.x > w + 40) c.x = -c.w - 40
          }
        }
        shake *= Math.exp(-dt * 3.2)
      }
      const I = reduce ? 0 : intensity(strike, t)

      ctx.save()
      if (shake > 0.02) {
        const amp = shake * (mobile ? 1.5 : 2.4)
        ctx.translate(Math.sin(t * 71) * amp, Math.cos(t * 53) * amp)
      }

      // --- latar ---
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#0c0306')
      bg.addColorStop(0.55, '#060204')
      bg.addColorStop(1, '#0d0307')
      ctx.fillStyle = bg
      ctx.fillRect(-12, -12, w + 24, h + 24)

      drawLayer(0, t)

      // cahaya dalam awan saat petir lembaran
      if (I > 0.02 && strike.sheet) {
        const r = w * 0.55
        const g = ctx.createRadialGradient(strike.gx, strike.gy + h * 0.06, 0, strike.gx, strike.gy + h * 0.06, r)
        g.addColorStop(0, `rgba(255,60,70,${0.38 * I})`)
        g.addColorStop(1, 'rgba(255,30,45,0)')
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h * 0.7)
        ctx.globalCompositeOperation = 'source-over'
      }

      drawLayer(1, t)
      drawLayer(2, t)
      if (I > 0.02 && !lowPower) litPass(I)
      if (I > 0.01 && strike.bolt) drawBolt(I)

      // --- hujan ---
      if (rain.length) {
        const boost = 1 + I * 2.6
        for (const heavy of [false, true]) {
          ctx.strokeStyle = heavy ? `rgba(255,140,150,${Math.min(0.5, 0.17 * boost)})` : `rgba(255,120,130,${Math.min(0.4, 0.08 * boost)})`
          ctx.lineWidth = heavy ? 1.2 : 0.9
          ctx.beginPath()
          for (const d of rain) {
            if (d.heavy !== heavy) continue
            d.y += d.speed * dt
            d.x -= d.speed * 0.17 * dt
            if (d.y > h + 40 || d.x < -40) {
              d.y = -rand(10, 80)
              d.x = rand(0, w + 80)
            }
            ctx.moveTo(d.x, d.y)
            ctx.lineTo(d.x - d.len * 0.17, d.y + d.len)
          }
          ctx.stroke()
        }
      }

      // --- kabut merah di cakrawala ---
      const fog = ctx.createLinearGradient(0, h * 0.55, 0, h)
      const pulse = 0.28 * (0.82 + 0.18 * Math.sin(t * 0.45)) + I * 0.22
      fog.addColorStop(0, 'rgba(90,8,20,0)')
      fog.addColorStop(1, `rgba(110,10,26,${pulse})`)
      ctx.fillStyle = fog
      ctx.fillRect(-12, h * 0.55, w + 24, h * 0.45 + 12)

      // --- kilatan layar penuh ---
      if (I > 0.01) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = `rgba(255,25,45,${0.05 * I})`
        ctx.fillRect(-12, -12, w + 24, h + 24)
        ctx.globalCompositeOperation = 'source-over'
      }

      ctx.restore()
      if (vignette) ctx.drawImage(vignette, 0, 0, w, h)
    },
  }
}
