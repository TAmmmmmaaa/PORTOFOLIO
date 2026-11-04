// Mode light: langit galaxy hangat. Gradien merah, oranye, pink dengan nebula yang melayang,
// bintang kecil berkelip, matahari yang bergerak dengan cincin zodiak, rasi zodiak yang muncul
// dan menghilang, planet yang hancur (serpihan bergerak), aliran batu angkasa, dan bintang jatuh.
import { SIGNS } from './zodiac.js'

const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const TAU = Math.PI * 2
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
const smooth = (x) => x * x * (3 - 2 * x)

const STAR_COLORS = [[255, 255, 255], [255, 246, 222], [255, 232, 196], [255, 214, 220]]
const ROCK_COLORS = ['#7a1d17', '#a02a1c', '#c2452a', '#8c3a24', '#5e1a18', '#b5532f']
const GLYPH_FONT = '"Segoe UI Symbol","Noto Sans Symbols 2","Apple Symbols","DejaVu Sans",sans-serif'

function polygon(sides, jitter) {
  const pts = []
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * TAU + rand(-0.25, 0.25)
    const r = 1 - jitter * Math.random()
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  return pts
}

function tracePoly(ctx, pts, x, y, s, rot) {
  const c = Math.cos(rot)
  const sn = Math.sin(rot)
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const px = x + (pts[i][0] * c - pts[i][1] * sn) * s
    const py = y + (pts[i][0] * sn + pts[i][1] * c) * s
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

export function createGalaxy({ ctx, mobile, reduce }) {
  let w = 0
  let h = 0
  let stars = []
  let rocks = []
  let frags = []
  let zods = []
  let meteors = []
  let nextMeteor = 1.2
  let signCursor = Math.floor(Math.random() * 12)
  let lowPower = false
  const sun = { x: 0, y: 0, r: 50 }
  const planet = { x: 0, y: 0, r: 90, core: polygon(9, 0.18), crackSeed: [] }
  let nextRing = 3
  const rings = []

  function pickSign() {
    const shown = new Set(zods.map((z) => z.sign))
    for (let i = 0; i < SIGNS.length; i++) {
      const s = SIGNS[signCursor % SIGNS.length]
      signCursor += 1 + Math.floor(Math.random() * 3)
      if (!shown.has(s)) return s
    }
    return SIGNS[signCursor % SIGNS.length]
  }

  function newZod(staggered) {
    const size = rand(mobile ? 90 : 120, mobile ? 135 : 200)
    const life = rand(18, 26)
    return {
      sign: pickSign(),
      x: rand(w * 0.07, w * 0.93),
      y: rand(h * 0.1, h * 0.9),
      size,
      rot: rand(-0.35, 0.35),
      vx: rand(-6, 6),
      vy: rand(-3, 3),
      life,
      age: staggered ? rand(0, life * 0.85) : 0,
      phase: rand(0, TAU),
    }
  }

  function spawnFragment(f, initial) {
    f.a = rand(0, TAU)
    f.d = initial ? rand(0.35, 2.4) : rand(0.5, 0.9)
    f.s = rand(0.05, 0.2)
    f.out = rand(0.012, 0.045) // kecepatan menjauh (dalam satuan jari-jari planet per detik)
    f.w = rand(0.04, 0.16) * (Math.random() < 0.5 ? -1 : 1) // kecepatan mengorbit
    f.rot = rand(0, TAU)
    f.rs = rand(-0.6, 0.6)
    f.pts = polygon(5 + Math.floor(Math.random() * 3), 0.45)
    f.color = ROCK_COLORS[Math.floor(Math.random() * ROCK_COLORS.length)]
    f.bob = rand(0, TAU)
    return f
  }

  function build() {
    const min = Math.min(w, h)
    sun.r = clamp(min * 0.085, 34, 78)
    planet.r = clamp(min * 0.13, 50, 125)
    planet.x = w * (mobile ? 0.78 : 0.82)
    planet.y = h * (mobile ? 0.8 : 0.74)
    planet.crackSeed = Array.from({ length: 6 }, () => ({ a: rand(0, TAU), len: rand(0.35, 0.8), bend: rand(-0.6, 0.6) }))

    // bintang: sebagian mengumpul di pita galaksi
    const count = Math.min(mobile ? 150 : 340, Math.round((w * h) / (mobile ? 5200 : 5800)))
    const diag = Math.hypot(w, h)
    const ba = -0.5
    stars = []
    for (let i = 0; i < count; i++) {
      let x
      let y
      if (Math.random() < 0.38) {
        const u = (Math.random() - 0.5) * diag * 1.1
        const v = gauss() * min * 0.13
        x = w / 2 + u * Math.cos(ba) - v * Math.sin(ba)
        y = h / 2 + u * Math.sin(ba) + v * Math.cos(ba)
        if (x < 0 || x > w || y < 0 || y > h) continue
      } else {
        x = rand(0, w)
        y = rand(0, h)
      }
      const r = Math.random() < 0.14 ? rand(1.7, 2.6) : rand(0.8, 1.7)
      stars.push({
        x,
        y,
        r,
        a: rand(0.72, 1),
        sp: rand(0.6, 2.4),
        ph: rand(0, TAU),
        drift: rand(1.5, 9),
        sparkle: r > 1.65,
        c: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      })
    }

    rocks = Array.from({ length: mobile ? 9 : 20 }, () => ({
      x: rand(-w * 0.2, w),
      y: rand(-h * 0.2, h),
      vx: rand(14, 34),
      vy: rand(6, 15),
      s: rand(2.5, 8),
      rot: rand(0, TAU),
      rs: rand(-1, 1),
      pts: polygon(6, 0.4),
      color: ROCK_COLORS[Math.floor(Math.random() * ROCK_COLORS.length)],
    }))

    frags = Array.from({ length: mobile ? 14 : 28 }, () => spawnFragment({}, true))
    zods = []
    for (let i = 0; i < (mobile ? 2 : 4); i++) zods.push(newZod(true))
  }

  /* ---------- bagian-bagian gambar ---------- */

  function drawBackground(t) {
    const g = ctx.createLinearGradient(0, 0, w * 0.45, h)
    g.addColorStop(0, '#ff7f73')
    g.addColorStop(0.32, '#ff9d86')
    g.addColorStop(0.68, '#ffbba6')
    g.addColorStop(1, '#ffd6c9')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // nebula melayang
    const R = Math.max(w, h) * 0.5
    const blobs = [
      [0.12, 0.18, 'rgba(235,30,55,0.40)', 0.021, 0.0],
      [0.88, 0.3, 'rgba(255,110,60,0.34)', 0.017, 1.4],
      [0.7, 0.85, 'rgba(255,90,140,0.32)', 0.019, 2.6],
      [0.25, 0.78, 'rgba(210,25,60,0.28)', 0.015, 3.9],
      [0.5, 0.45, 'rgba(255,255,255,0.30)', 0.013, 5.1],
      [0.95, 0.9, 'rgba(255,150,70,0.28)', 0.02, 0.8],
    ]
    for (const [bx, by, col, sp, ph] of blobs) {
      const x = w * bx + Math.sin(t * sp * 6 + ph) * w * 0.07
      const y = h * by + Math.cos(t * sp * 5 + ph) * h * 0.06
      const rr = R * (0.8 + 0.1 * Math.sin(t * sp * 9 + ph))
      const rg = ctx.createRadialGradient(x, y, 0, x, y, rr)
      rg.addColorStop(0, col)
      rg.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'))
      ctx.fillStyle = rg
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2)
    }

    // pita galaksi
    const min = Math.min(w, h)
    const bw = min * 0.24
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.rotate(-0.5 + Math.sin(t * 0.02) * 0.03)
    const bg = ctx.createLinearGradient(0, -bw, 0, bw)
    bg.addColorStop(0, 'rgba(255,255,255,0)')
    bg.addColorStop(0.5, 'rgba(255,248,240,0.34)')
    bg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = bg
    ctx.fillRect(-Math.hypot(w, h), -bw, Math.hypot(w, h) * 2, bw * 2)
    ctx.restore()
  }

  function drawStars(t, dt) {
    for (const s of stars) {
      if (!reduce) {
        s.x -= s.drift * dt
        if (s.x < -4) s.x = w + 4
      }
      const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * s.sp + s.ph)
      const a = s.a * tw
      if (s.r > 1.3) {
        ctx.fillStyle = `rgba(255,236,210,${a * 0.28})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r * 2.6, 0, TAU)
        ctx.fill()
      }
      ctx.fillStyle = `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${a})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, TAU)
      ctx.fill()
      if (s.sparkle && !lowPower) {
        const L = s.r * (4.5 + 3.5 * tw)
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(s.x - L, s.y)
        ctx.lineTo(s.x + L, s.y)
        ctx.moveTo(s.x, s.y - L)
        ctx.lineTo(s.x, s.y + L)
        ctx.stroke()
      }
    }
  }

  function updateSun(t) {
    const u = 0.5 + 0.5 * Math.sin(t * 0.03)
    sun.x = w * (0.14 + 0.72 * u)
    sun.y = h * (0.34 - 0.13 * Math.sin(Math.PI * u))
  }

  function drawSun(t) {
    const { x, y, r } = sun
    const pulse = 1 + 0.03 * Math.sin(t * 1.3)

    // korona
    const cr = r * 4.6 * pulse
    const cg = ctx.createRadialGradient(x, y, r * 0.5, x, y, cr)
    cg.addColorStop(0, 'rgba(255,246,205,0.9)')
    cg.addColorStop(0.2, 'rgba(255,214,120,0.55)')
    cg.addColorStop(0.5, 'rgba(255,140,70,0.26)')
    cg.addColorStop(1, 'rgba(255,70,50,0)')
    ctx.fillStyle = cg
    ctx.fillRect(x - cr, y - cr, cr * 2, cr * 2)

    // sinar berputar
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(t * 0.05)
    const rays = 16
    for (let i = 0; i < rays; i++) {
      ctx.rotate(TAU / rays)
      const len = r * (i % 2 ? 2.1 : 2.8) * (1 + 0.08 * Math.sin(t * 1.7 + i))
      ctx.fillStyle = `rgba(255,226,150,${i % 2 ? 0.14 : 0.2})`
      ctx.beginPath()
      ctx.moveTo(r * 0.85, -r * 0.09)
      ctx.lineTo(len, 0)
      ctx.lineTo(r * 0.85, r * 0.09)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()

    // cakram
    const dg = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r * pulse)
    dg.addColorStop(0, '#fffbe6')
    dg.addColorStop(0.55, '#ffd86a')
    dg.addColorStop(1, '#ff8f3a')
    ctx.fillStyle = dg
    ctx.beginPath()
    ctx.arc(x, y, r * pulse, 0, TAU)
    ctx.fill()

    // cincin zodiak di sekeliling matahari
    const r1 = r * 2.55
    const r2 = r * 3.05
    ctx.strokeStyle = 'rgba(125,18,28,0.34)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(x, y, r1, 0, TAU)
    ctx.moveTo(x + r2, y)
    ctx.arc(x, y, r2, 0, TAU)
    ctx.stroke()
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-t * 0.018)
    ctx.beginPath()
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU
      const len = i % 6 === 0 ? r * 0.2 : r * 0.1
      ctx.moveTo(Math.cos(a) * r2, Math.sin(a) * r2)
      ctx.lineTo(Math.cos(a) * (r2 + len), Math.sin(a) * (r2 + len))
    }
    ctx.stroke()
    ctx.font = `${Math.round(r * 0.46)}px ${GLYPH_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(125,18,28,0.6)'
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU - Math.PI / 2
      const rr = (r1 + r2) / 2
      ctx.save()
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr)
      ctx.rotate(a + Math.PI / 2)
      ctx.fillText(SIGNS[i].glyph, 0, 0)
      ctx.restore()
    }
    ctx.restore()
  }

  function drawZodiacs(t, dt) {
    for (let i = 0; i < zods.length; i++) {
      const z = zods[i]
      if (!reduce) {
        z.age += dt
        z.x += z.vx * dt
        z.y += z.vy * dt
        if (z.age > z.life) {
          zods[i] = newZod(false)
          continue
        }
      }
      const env = reduce ? 0.9 : smooth(clamp(Math.min(z.age / 3.5, (z.life - z.age) / 3.5), 0, 1))
      if (env < 0.01) continue
      const { sign, size } = z
      ctx.save()
      ctx.translate(z.x, z.y)
      ctx.rotate(z.rot + (reduce ? 0 : Math.sin(t * 0.1 + z.phase) * 0.04))
      const P = sign.pts.map(([px, py]) => [(px - 0.5) * size, (py - 0.5) * size * 0.9])

      ctx.lineCap = 'round'
      ctx.strokeStyle = `rgba(150,20,35,${0.22 * env})`
      ctx.lineWidth = 2.6
      ctx.beginPath()
      for (const [a, b] of sign.links) {
        ctx.moveTo(P[a][0], P[a][1])
        ctx.lineTo(P[b][0], P[b][1])
      }
      ctx.stroke()
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * env})`
      ctx.lineWidth = 1.1
      ctx.beginPath()
      for (const [a, b] of sign.links) {
        ctx.moveTo(P[a][0], P[a][1])
        ctx.lineTo(P[b][0], P[b][1])
      }
      ctx.stroke()

      P.forEach(([px, py], k) => {
        const tw = reduce ? 1 : 0.7 + 0.3 * Math.sin(t * 2 + k * 1.7 + z.phase)
        const g = ctx.createRadialGradient(px, py, 0, px, py, 9)
        g.addColorStop(0, `rgba(255,252,235,${0.8 * env * tw})`)
        g.addColorStop(1, 'rgba(255,200,160,0)')
        ctx.fillStyle = g
        ctx.fillRect(px - 9, py - 9, 18, 18)
        ctx.fillStyle = `rgba(255,255,255,${env})`
        ctx.beginPath()
        ctx.arc(px, py, 2.2, 0, TAU)
        ctx.fill()
      })

      ctx.font = `600 ${mobile ? 10 : 11}px ui-monospace, "JetBrains Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = `rgba(125,18,28,${0.72 * env})`
      ctx.fillText(`${sign.glyph}  ${sign.name}`, 0, size * 0.5 + 8)
      ctx.restore()
    }
  }

  function drawRocks(dt) {
    for (const r of rocks) {
      if (!reduce) {
        r.x += r.vx * dt
        r.y += r.vy * dt
        r.rot += r.rs * dt
        if (r.x > w + 20 || r.y > h + 20) {
          r.x = -20 - rand(0, w * 0.3)
          r.y = rand(-h * 0.2, h * 0.8)
        }
      }
      tracePoly(ctx, r.pts, r.x, r.y, r.s, r.rot)
      ctx.fillStyle = r.color
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,215,170,0.5)'
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
  }

  function drawPlanet(t, dt) {
    const { x, y, r } = planet
    // arah cahaya: dari planet menuju matahari
    const lx = sun.x - x
    const ly = sun.y - y
    const ll = Math.hypot(lx, ly) || 1
    const ux = lx / ll
    const uy = ly / ll

    // lubang panas di pusat yang sedang meledak
    const heat = 0.8 + 0.2 * Math.sin(t * 1.9)
    const hg = ctx.createRadialGradient(x, y, 0, x, y, r * 1.9)
    hg.addColorStop(0, `rgba(255,236,160,${0.7 * heat})`)
    hg.addColorStop(0.25, `rgba(255,130,40,${0.5 * heat})`)
    hg.addColorStop(0.6, `rgba(220,40,40,${0.2 * heat})`)
    hg.addColorStop(1, 'rgba(200,30,40,0)')
    ctx.fillStyle = hg
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4)

    // gelombang kejut berkala
    if (!reduce) {
      nextRing -= dt
      if (nextRing <= 0) {
        rings.push({ age: 0 })
        nextRing = rand(5, 8)
      }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i]
      ring.age += dt
      const k = ring.age / 4.2
      if (k >= 1) {
        rings.splice(i, 1)
        continue
      }
      ctx.strokeStyle = `rgba(255,170,90,${0.5 * (1 - k)})`
      ctx.lineWidth = 2.5 * (1 - k) + 0.5
      ctx.beginPath()
      ctx.arc(x, y, r * (0.6 + 2.4 * k), 0, TAU)
      ctx.stroke()
    }

    // serpihan di belakang inti dulu, lalu inti, lalu serpihan di depan
    const placed = frags.map((f) => {
      if (!reduce) {
        f.d += f.out * dt
        f.a += f.w * dt
        f.rot += f.rs * dt
        if (f.d > 2.7) spawnFragment(f, false)
      }
      const dist = f.d * r * (1 + 0.04 * Math.sin(t * 0.8 + f.bob))
      const fx = x + Math.cos(f.a) * dist
      const fy = y + Math.sin(f.a) * dist * 0.78
      const fade = clamp((2.7 - f.d) / 0.5, 0, 1) * clamp((f.d - 0.3) / 0.25, 0, 1)
      return { f, fx, fy, fade, back: Math.sin(f.a) < -0.15 }
    })
    const drawFrag = ({ f, fx, fy, fade }) => {
      const s = f.s * r
      const g = ctx.createLinearGradient(fx + ux * s, fy + uy * s, fx - ux * s, fy - uy * s)
      g.addColorStop(0, '#ffd2a0')
      g.addColorStop(0.35, f.color)
      g.addColorStop(1, '#2a0a0e')
      ctx.globalAlpha = 0.95 * fade
      tracePoly(ctx, f.pts, fx, fy, s, f.rot)
      ctx.fillStyle = g
      ctx.fill()
      ctx.strokeStyle = 'rgba(70,10,14,0.55)'
      ctx.lineWidth = 0.9
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    placed.filter((p) => p.back).forEach(drawFrag)

    // inti yang tersisa dengan retakan lava
    const cr = r * 0.72
    const cg = ctx.createLinearGradient(x + ux * cr, y + uy * cr, x - ux * cr, y - uy * cr)
    cg.addColorStop(0, '#ffc593')
    cg.addColorStop(0.3, '#c2452a')
    cg.addColorStop(0.75, '#6e1a1a')
    cg.addColorStop(1, '#2a0a0e')
    tracePoly(ctx, planet.core, x, y, cr, t * 0.02)
    ctx.fillStyle = cg
    ctx.fill()
    ctx.strokeStyle = 'rgba(70,10,14,0.6)'
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.save()
    tracePoly(ctx, planet.core, x, y, cr, t * 0.02)
    ctx.clip()
    ctx.lineCap = 'round'
    for (const c of planet.crackSeed) {
      const a = c.a + t * 0.02
      const x1 = x + Math.cos(a) * cr * 0.1
      const y1 = y + Math.sin(a) * cr * 0.1
      const x2 = x + Math.cos(a + c.bend) * cr * c.len * 1.4
      const y2 = y + Math.sin(a + c.bend) * cr * c.len * 1.4
      ctx.strokeStyle = `rgba(255,${150 + 60 * heat},60,${0.55 + 0.4 * heat})`
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo((x1 + x2) / 2 + Math.sin(a * 3) * 8, (y1 + y2) / 2 + Math.cos(a * 3) * 8, x2, y2)
      ctx.stroke()
    }
    ctx.restore()

    placed.filter((p) => !p.back).forEach(drawFrag)
  }

  function drawMeteors(t, dt) {
    if (!reduce) {
      if (t > nextMeteor) {
        const angle = (Math.PI / 180) * rand(26, 44)
        const fast = rand(560, 760)
        const comet = Math.random() < 0.25
        meteors.push({
          x: w * rand(0.2, 0.95),
          y: rand(0, h * 0.4),
          vx: Math.cos(angle) * fast,
          vy: Math.sin(angle) * fast,
          life: 0,
          max: comet ? rand(1.6, 2.1) : rand(1.0, 1.5),
          tail: comet ? rand(220, 300) : rand(130, 210),
          comet,
        })
        nextMeteor = t + rand(2.2, 5.5)
      }
    }
    meteors = meteors.filter((m) => m.life < m.max)
    for (const m of meteors) {
      m.life += dt
      m.x += m.vx * dt
      m.y += m.vy * dt
      const fade = Math.sin(Math.PI * clamp(m.life / m.max, 0, 1))
      const len = Math.hypot(m.vx, m.vy)
      const tx = m.x - (m.vx / len) * m.tail
      const ty = m.y - (m.vy / len) * m.tail
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty)
      if (m.comet) {
        g.addColorStop(0, `rgba(255,250,235,${0.95 * fade})`)
        g.addColorStop(0.3, `rgba(255,120,60,${0.6 * fade})`)
        g.addColorStop(1, 'rgba(220,30,50,0)')
      } else {
        g.addColorStop(0, `rgba(255,255,255,${fade})`)
        g.addColorStop(1, 'rgba(255,190,120,0)')
      }
      ctx.strokeStyle = g
      ctx.lineCap = 'round'
      ctx.lineWidth = m.comet ? 3 : 1.8
      ctx.beginPath()
      ctx.moveTo(m.x, m.y)
      ctx.lineTo(tx, ty)
      ctx.stroke()
      const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.comet ? 11 : 7)
      hg.addColorStop(0, `rgba(255,255,255,${fade})`)
      hg.addColorStop(1, 'rgba(255,200,140,0)')
      ctx.fillStyle = hg
      ctx.fillRect(m.x - 12, m.y - 12, 24, 24)
    }
  }

  return {
    resize(nw, nh) {
      w = nw
      h = nh
      build()
    },
    lowPower() {
      lowPower = true
      stars = stars.filter((_, i) => i % 2 === 0)
      rocks = rocks.slice(0, Math.floor(rocks.length / 2))
    },
    draw(t, dt) {
      updateSun(t)
      drawBackground(t)
      drawStars(t, dt)
      drawSun(t)
      drawZodiacs(t, dt)
      if (!lowPower) drawRocks(dt)
      drawPlanet(t, dt)
      drawMeteors(t, dt)
    },
  }
}
