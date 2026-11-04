// Simulasi lanyard sendiri (Verlet + Position Based Dynamics), tanpa library fisika.
//
// Rantai dari atas ke bawah:
//   titik gantung (tetap) -> tali (banyak titik) -> klip -> cincin -> lubang kartu -> kartu
//
// - Tali : rantai titik dengan jarak tetap (lentur seperti kain).
// - Klip : ruas kaku dari ujung tali ke bawah.
// - Cincin: ruas kaku dari klip ke lubang kartu (bisa berputar bebas di kedua ujungnya).
// - Kartu : lima titik (lubang + empat sudut) dengan semua jarak dikunci, jadi kartu
//           adalah benda kaku 3D yang bisa miring, berayun, dan berputar ke segala arah.
// - Pelintiran: kartu tergantung pada satu titik, jadi bebas berputar mengelilingi sumbu
//           vertikal. Tali yang terpuntir menariknya kembali seperti pegas torsi, dan
//           "target" pegas itu bertambah PI setiap kartu dibalik.

const SUB = 4 // sub-langkah per frame
const ITER_IDLE = 10
const ITER_GRAB = 24 // iterasi penyelesaian kendala per sub-langkah
const GRAVITY = -34
const DAMP = 0.9982 // redaman udara per sub-langkah (makin kecil = ayunan makin cepat reda)
const Z_SPRING = 7 // menjaga ayunan tetap dekat bidang layar
const Z_DAMP = 0.985
const TORSION_K = 70 // kekakuan pegas putar balik
const STRAP_COMPLIANCE = 7e-5 // kelenturan tali karet (makin besar = makin mudah melar)
const STRAP_MAX_STRETCH = 0.55 // batas regangan saat ditarik (55%)
const STRAP_DAMP = 0.1 // redam pantulan karet per sub-langkah
const CARD_SPIN_DAMP = 0 // redam goyangan miring kartu per sub-langkah
const GRAB_GAIN = 0.2
const GRAB_MAX_STEP = 0.07
const TORSION_C = 7.5 // redaman pegas putar balik (kurang teredam = ada pantulan)

export function createLanyardSim({
  cardW,
  cardH,
  slotY, // jarak lubang dari pusat kartu (ke atas)
  anchor,
  strapLen = 2.5,
  strapN = 8,
  clipLen = 0.2,
  ringLen = 0.2,
}) {
  const P = []
  const add = (x, y, z, mass) => {
    P.push({ x, y, z, px: x, py: y, pz: z, w: mass ? 1 / mass : 0 })
    return P.length - 1
  }

  // Tali
  for (let i = 0; i <= strapN; i++) {
    add(anchor.x, anchor.y - (strapLen * i) / strapN, 0, i === 0 ? 0 : 0.25)
  }
  const iEnd = strapN // ujung tali = atas klip
  const iClipBottom = add(anchor.x, anchor.y - strapLen - clipLen, 0, 0.4)
  const sY = anchor.y - strapLen - clipLen - ringLen
  const iSlot = add(anchor.x, sY, 0, 0.3)

  // Kartu
  const cy = sY - slotY
  const hw = cardW / 2
  const hh = cardH / 2
  const iTL = add(anchor.x - hw, cy + hh, 0, 1)
  const iTR = add(anchor.x + hw, cy + hh, 0, 1)
  const iBL = add(anchor.x - hw, cy - hh, 0, 1)
  const iBR = add(anchor.x + hw, cy - hh, 0, 1)

  // Kendala jarak [a, b, panjang]
  const C = []
  const link = (a, b, alpha = 0) => {
    const dx = P[a].x - P[b].x
    const dy = P[a].y - P[b].y
    const dz = P[a].z - P[b].z
    C.push([a, b, Math.hypot(dx, dy, dz), alpha])
  }
  // Tali: karet, jadi bisa melar (kendala lunak / XPBD). Bagian lain kaku.
  for (let i = 0; i < strapN; i++) link(i, i + 1, STRAP_COMPLIANCE)
  const strapSegs = C.length
  link(iEnd, iClipBottom)
  link(iClipBottom, iSlot)
  for (const c of [iTL, iTR, iBL, iBR]) link(iSlot, c)
  link(iTL, iTR)
  link(iBL, iBR)
  link(iTL, iBL)
  link(iTR, iBR)
  link(iTL, iBR)
  link(iTR, iBL)

  const cardIdx = [iTL, iTR, iBL, iBR]
  const home = P.map((p) => ({ x: p.x, y: p.y, z: p.z }))

  const yaw = { u: 0, raw: 0, prev: 0, target: 0 }
  let grab = null // { w: [TL,TR,BL,BR], tx, ty }
  let wind = 1

  /* ---------- Bantu ---------- */

  const frameOut = {
    c: { x: 0, y: 0, z: 0 },
    r: { x: 1, y: 0, z: 0 },
    u: { x: 0, y: 1, z: 0 },
    n: { x: 0, y: 0, z: 1 },
  }

  function norm(v) {
    const l = Math.hypot(v.x, v.y, v.z) || 1
    v.x /= l
    v.y /= l
    v.z /= l
    return v
  }

  // Kerangka kartu: pusat, kanan (r), atas (u), depan (n).
  function frame() {
    const tl = P[iTL]
    const tr = P[iTR]
    const bl = P[iBL]
    const br = P[iBR]
    const { c, r, u, n } = frameOut
    c.x = (tl.x + tr.x + bl.x + br.x) / 4
    c.y = (tl.y + tr.y + bl.y + br.y) / 4
    c.z = (tl.z + tr.z + bl.z + br.z) / 4
    r.x = tr.x - tl.x + (br.x - bl.x)
    r.y = tr.y - tl.y + (br.y - bl.y)
    r.z = tr.z - tl.z + (br.z - bl.z)
    norm(r)
    u.x = tl.x + tr.x - bl.x - br.x
    u.y = tl.y + tr.y - bl.y - br.y
    u.z = tl.z + tr.z - bl.z - br.z
    norm(u)
    // n = r x u, lalu u = n x r supaya ortogonal
    n.x = r.y * u.z - r.z * u.y
    n.y = r.z * u.x - r.x * u.z
    n.z = r.x * u.y - r.y * u.x
    norm(n)
    u.x = n.y * r.z - n.z * r.y
    u.y = n.z * r.x - n.x * r.z
    u.z = n.x * r.y - n.y * r.x
    return frameOut
  }

  function measureYaw() {
    const f = frame()
    const raw = Math.atan2(-f.r.z, f.r.x)
    let d = raw - yaw.raw
    d -= Math.PI * 2 * Math.round(d / (Math.PI * 2))
    yaw.u += d
    yaw.raw = raw
  }

  // Putar kartu mengelilingi sumbu vertikalnya yang melewati lubang.
  function spinCard(delta) {
    const f = frame()
    const a = f.u
    const s = P[iSlot]
    const cos = Math.cos(delta)
    const sin = Math.sin(delta)
    for (const i of cardIdx) {
      const p = P[i]
      const vx = p.x - s.x
      const vy = p.y - s.y
      const vz = p.z - s.z
      const dot = a.x * vx + a.y * vy + a.z * vz
      const cx = a.y * vz - a.z * vy
      const cy2 = a.z * vx - a.x * vz
      const cz = a.x * vy - a.y * vx
      p.x = s.x + vx * cos + cx * sin + a.x * dot * (1 - cos)
      p.y = s.y + vy * cos + cy2 * sin + a.y * dot * (1 - cos)
      p.z = s.z + vz * cos + cz * sin + a.z * dot * (1 - cos)
    }
  }

  const lambda = new Float64Array(C.length)

  function solve(h) {
    const n = C.length
    lambda.fill(0)
    const inv = 1 / (h * h)
    const iters = grab ? ITER_GRAB : ITER_IDLE
    const slot = P[iSlot]
    for (let it = 0; it < iters; it++) {
      // Kartu tidak boleh terlipat naik melewati cincin: sudut bawah selalu di bawah lubang.
      for (const i of cardIdx) {
        const lim = i === iBL || i === iBR ? slot.y - 0.3 : slot.y + 1.2
        if (P[i].y > lim) P[i].y = lim
      }
      for (let k = 0; k < 2 * n; k++) {
        const ci = k < n ? k : 2 * n - 1 - k // maju lalu mundur: konvergen lebih cepat
        const c = C[ci]
        const a = P[c[0]]
        const b = P[c[1]]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dz = b.z - a.z
        const dist = Math.hypot(dx, dy, dz) || 1e-9
        const at = c[3] * inv
        const denom = a.w + b.w + at
        if (denom === 0) continue
        const dl = (-(dist - c[2]) - at * lambda[ci]) / denom
        lambda[ci] += dl
        const nx = (dx / dist) * dl
        const ny = (dy / dist) * dl
        const nz = (dz / dist) * dl
        a.x -= a.w * nx
        a.y -= a.w * ny
        a.z -= a.w * nz
        b.x += b.w * nx
        b.y += b.w * ny
        b.z += b.w * nz
      }
    }
  }

  // Karet punya gesekan dalam: saat melar, gerak kartu searah tali diredam supaya
  // tidak memantul seperti pegas baja.
  function dampStrap() {
    let len = 0
    for (let i = 0; i < strapSegs; i++) {
      const c = C[i]
      len += Math.hypot(P[c[1]].x - P[c[0]].x, P[c[1]].y - P[c[0]].y, P[c[1]].z - P[c[0]].z)
    }
    const strain = len / strapLen - 1
    if (strain < 0.07) return
    const k = STRAP_DAMP * Math.min(1, (strain - 0.07) / 0.08)
    const e = P[iEnd]
    const a = P[0]
    const dx = e.x - a.x
    const dy = e.y - a.y
    const dz = e.z - a.z
    const d = Math.hypot(dx, dy, dz) || 1e-9
    const nx = dx / d
    const ny = dy / d
    const nz = dz / d
    for (let i = iEnd; i < P.length; i++) {
      const p = P[i]
      const va = (p.x - p.px) * nx + (p.y - p.py) * ny + (p.z - p.pz) * nz
      p.px += nx * va * k
      p.py += ny * va * k
      p.pz += nz * va * k
    }
  }

  // Redam putaran miring kartu (di bidang layar) tanpa mengganggu gerak ayunannya.
  function dampCardTilt() {
    const pts = cardIdx.map((i) => P[i])
    let cx = 0
    let cy = 0
    let vx = 0
    let vy = 0
    for (const p of pts) {
      cx += p.x / 4
      cy += p.y / 4
      vx += (p.x - p.px) / 4
      vy += (p.y - p.py) / 4
    }
    let L = 0
    let I = 0
    for (const p of pts) {
      const rx = p.x - cx
      const ry = p.y - cy
      L += rx * (p.y - p.py - vy) - ry * (p.x - p.px - vx)
      I += rx * rx + ry * ry
    }
    if (I < 1e-9) return
    const w = (L / I) * CARD_SPIN_DAMP
    for (const p of pts) {
      p.px -= w * (p.y - cy)
      p.py += w * (p.x - cx)
    }
  }

  function applyGrab() {
    if (!grab) return
    const [tl, tr, bl, br] = cardIdx.map((i) => P[i])
    const w = grab.w
    const px = w[0] * tl.x + w[1] * tr.x + w[2] * bl.x + w[3] * br.x
    const py = w[0] * tl.y + w[1] * tr.y + w[2] * bl.y + w[3] * br.y
    let dx = (grab.tx - px) * GRAB_GAIN
    let dy = (grab.ty - py) * GRAB_GAIN
    const l = Math.hypot(dx, dy)
    if (l > GRAB_MAX_STEP) {
      dx *= GRAB_MAX_STEP / l
      dy *= GRAB_MAX_STEP / l
    }
    const s2 = w[0] * w[0] + w[1] * w[1] + w[2] * w[2] + w[3] * w[3]
    const pts = [tl, tr, bl, br]
    for (let i = 0; i < 4; i++) {
      pts[i].x += (w[i] * dx) / s2
      pts[i].y += (w[i] * dy) / s2
    }
  }

  /* ---------- API ---------- */

  function sub(h, t) {
    const a = P[0]
    a.x = anchor.x
    a.y = anchor.y
    a.z = 0
    a.px = a.x
    a.py = a.y
    a.pz = 0

    // Pegas torsi: tarik sudut putar kartu ke target (0 = depan, PI = belakang, dst).
    measureYaw()
    // Putaran penuh (2 PI) tampilannya sama, jadi sudut dijaga tetap kecil.
    for (const sign of [1, -1]) {
      while (yaw.u * sign > Math.PI * 3) {
        yaw.u -= Math.PI * 2 * sign
        yaw.prev -= Math.PI * 2 * sign
        yaw.target -= Math.PI * 2 * sign
      }
    }
    const rate = (yaw.u - yaw.prev) / h
    yaw.prev = yaw.u
    // Kalau kartu terlempar jauh dari target, ambil sisi terdekat (kartu tidak boleh berputar liar).
    if (Math.abs(yaw.u - yaw.target) > Math.PI * 3) yaw.target = Math.round(yaw.u / Math.PI) * Math.PI
    const alpha = Math.max(-300, Math.min(300, TORSION_K * (yaw.target - yaw.u) - TORSION_C * rate))

    // Angin sangat pelan supaya kartu terasa hidup.
    const wx = wind * (1.5 * Math.sin(t * 0.8) + 0.9 * Math.sin(t * 1.9 + 1))
    const wz = wind * 0.8 * Math.sin(t * 0.6 + 2)

    const hh = h * h
    for (const p of P) {
      if (p.w === 0) continue
      const vx = (p.x - p.px) * DAMP
      const vy = (p.y - p.py) * DAMP
      const vz = (p.z - p.pz) * DAMP * Z_DAMP
      p.px = p.x
      p.py = p.y
      p.pz = p.z
      p.x += vx + wx * hh
      p.y += vy + GRAVITY * hh
      p.z += vz + (wz - Z_SPRING * p.z) * hh
    }

    spinCard(alpha * hh)
    applyGrab()
    solve(h)
    dampStrap()
    dampCardTilt()
  }

  function reset() {
    const dx = anchor.x - home[0].x
    P.forEach((p, i) => {
      p.x = p.px = home[i].x + dx
      p.y = p.py = home[i].y
      p.z = p.pz = home[i].z
    })
    yaw.u = yaw.raw = yaw.prev = yaw.target = 0
    grab = null
  }

  let time = 0
  function step(dt) {
    const h = dt / SUB
    for (let i = 0; i < SUB; i++) {
      time += h
      sub(h, time)
    }
    // Pengaman: kalau simulasi sampai meledak, pulihkan ke posisi gantung.
    for (const p of P) {
      if (!Number.isFinite(p.x + p.y + p.z) || Math.abs(p.x - anchor.x) > 30 || Math.abs(p.y) > 30 || Math.abs(p.z) > 12) {
        reset()
        break
      }
    }
  }

  // Tambah kecepatan ke seluruh kartu dan cincin (satuan dunia per detik).
  function kick(vx, vy, vz) {
    const h = 1 / (60 * SUB)
    for (const i of [...cardIdx, iSlot, iClipBottom]) {
      P[i].px -= vx * h
      P[i].py -= vy * h
      P[i].pz -= vz * h
    }
  }

  function flip(dir = 1) {
    if (Math.abs(yaw.target + Math.PI * dir - yaw.u) <= Math.PI * 2.2) yaw.target += Math.PI * dir
    kick(2.2 * dir, 0, 0)
  }

  function shiftX(dx) {
    for (const p of P) {
      p.x += dx
      p.px += dx
    }
    anchor.x += dx
  }

  // Mulai dari kartu yang terpilin, jadi saat halaman dibuka ia berayun dan berputar lurus.
  function intro(spin = -1.1, swing = 1.6) {
    spinCard(spin)
    for (const p of P) {
      p.px = p.x
      p.py = p.y
      p.pz = p.z
    }
    const f = frame()
    yaw.raw = Math.atan2(-f.r.z, f.r.x)
    yaw.u = yaw.raw
    yaw.prev = yaw.u
    kick(swing, 0, 0.6)
  }

  function grabAt(x, y, z) {
    const f = frame()
    const dx = x - f.c.x
    const dy = y - f.c.y
    const dz = z - f.c.z
    const sx = Math.min(1, Math.max(0, (dx * f.r.x + dy * f.r.y + dz * f.r.z) / cardW + 0.5))
    const sy = Math.min(1, Math.max(0, (dx * f.u.x + dy * f.u.y + dz * f.u.z) / cardH + 0.5))
    grab = {
      w: [(1 - sx) * sy, sx * sy, (1 - sx) * (1 - sy), sx * (1 - sy)], // TL, TR, BL, BR
      tx: x,
      ty: y,
      // Jangkauan maksimum: panjang rantai + jarak titik pegangan dari lubang kartu.
      reach: (strapLen * (1 + STRAP_MAX_STRETCH) + clipLen + ringLen + Math.hypot(x - P[iSlot].x, y - P[iSlot].y, z - P[iSlot].z)) * 0.97,
    }
  }

  return {
    P,
    anchor,
    yaw,
    frame,
    step,
    kick,
    flip,
    shiftX,
    intro,
    grabAt,
    dragTo: (x, y) => {
      if (!grab) return
      // Tidak bisa ditarik lebih jauh dari panjang tali.
      let dx = x - anchor.x
      let dy = y - anchor.y
      const l = Math.hypot(dx, dy)
      if (l > grab.reach) {
        dx *= grab.reach / l
        dy *= grab.reach / l
      }
      grab.tx = anchor.x + dx
      // Kartu tidak bisa diangkat melewati titik gantung.
      grab.ty = Math.min(anchor.y + dy, anchor.y - 1.2)
    },
    strapStrain: () => {
      let len = 0
      for (let i = 0; i < strapSegs; i++) {
        const c = C[i]
        len += Math.hypot(P[c[1]].x - P[c[0]].x, P[c[1]].y - P[c[0]].y, P[c[1]].z - P[c[0]].z)
      }
      return len / strapLen - 1
    },
    reset,
    release: () => {
      grab = null
    },
    isGrabbed: () => !!grab,
    setWind: (v) => {
      wind = v
    },
    idx: { end: iEnd, clipBottom: iClipBottom, slot: iSlot, strapN },
    constraints: C,
  }
}
