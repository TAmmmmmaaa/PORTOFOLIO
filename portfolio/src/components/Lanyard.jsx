import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { profile } from '../config'
import {
  BAND_ASPECT,
  CARD_H,
  CARD_T,
  CARD_W,
  createBandBump,
  createBandTexture,
  createCardGeometries,
  createCardTexture,
} from '../lib/cardAssets'
import { createLanyardSim } from '../lib/lanyardSim'
import { cardsReady, markCard, markScene } from '../lib/loadState'

const SEG = 48 // jumlah segmen pita tali
const STRAP_W = 0.34 // lebar tali
const STRAP_T = 0.009 // setengah ketebalan tali (tali punya tebal, bukan kertas)
const STRAP_LEN = 2.5 // panjang tali (di atas klip)
const ANCHOR_Y = 3.6 // titik gantung (di atas layar)
const SLOT_Y = CARD_H / 2 - 0.1 // titik gantung cincin, relatif terhadap pusat kartu
const CLIP_LEN = 0.2
const RING_LEN = 0.2
const RING_TUBE = 0.026
const RING_ANG = 1.0 // cincin dimiringkan terhadap kartu supaya menembus lubang secara miring
const EYE_R = 0.08 // mata kait di bawah klip
const EYE_TUBE = 0.014
const UV_SCALE = (STRAP_LEN + 0.05) / (BAND_ASPECT * STRAP_W)
const VPS = 8 // jumlah titik per potongan tali: depan 2, belakang 2, tepi kanan 2, tepi kiri 2

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// Basis lokal yang menghadap kamera, lalu diputar `theta` mengelilingi sumbu `up`.
// outX = lebar, outY = arah `up`, outZ = normal permukaan. Tanpa alokasi objek baru.
function yawBasis(up, theta, outX, outY, outZ) {
  outY.copy(up).normalize()
  outX.set(outY.y, -outY.x, 0)
  if (outX.lengthSq() < 1e-6) outX.set(1, 0, 0)
  outX.normalize()
  outZ.crossVectors(outX, outY)
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  const xx = outX.x * c - outZ.x * s
  const xy = outX.y * c - outZ.y * s
  const xz = outX.z * c - outZ.z * s
  const zx = outZ.x * c + outX.x * s
  const zy = outZ.y * c + outX.y * s
  const zz = outZ.z * c + outX.z * s
  outX.set(xx, xy, xz)
  outZ.set(zx, zy, zz)
}

/* Rantai: titik gantung -> tali -> klip -> cincin -> lubang kartu -> kartu. */
function Band() {
  const { viewport, size, camera } = useThree()
  const offsetX =
    size.width > 1000 ? (0.5 - Math.min(0.48, 780 / size.width) / 2) * viewport.width : 0

  const sim = useMemo(() => {
    const s = createLanyardSim({
      cardW: CARD_W,
      cardH: CARD_H,
      slotY: SLOT_Y,
      anchor: { x: offsetX, y: ANCHOR_Y },
      strapLen: STRAP_LEN,
      strapN: 8,
      clipLen: CLIP_LEN,
      ringLen: RING_LEN,
    })
    s.intro() // kartu mulai terpilin dan berayun, lalu lurus sendiri
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cardRef = useRef()
  const clipRef = useRef()
  const ringRef = useRef()
  const drag = useRef(null)
  const flipped = useRef(false)
  const [hovered, setHovered] = useState(false)
  const [grabbing, setGrabbing] = useState(false)

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      a: new THREE.Vector3(),
      x: new THREE.Vector3(),
      y: new THREE.Vector3(),
      z: new THREE.Vector3(),
      ray: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      cam: { x: 0, y: 0 },
      pts: Array.from({ length: SEG + 1 }, () => new THREE.Vector3()),
    }),
    [],
  )

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(Array.from({ length: 9 }, () => new THREE.Vector3())),
    [],
  )

  const { slab, face } = useMemo(() => createCardGeometries(), [])

  const textures = useMemo(
    () => ({
      front: createCardTexture('front', profile.images.cardFront, profile, () => markCard('front')),
      back: createCardTexture('back', profile.images.cardBack, profile, () => markCard('back')),
      band: createBandTexture(profile.name),
      bump: createBandBump(),
    }),
    [],
  )

  // Tali = pita 3D bertebal: sisi depan, sisi belakang, dan dua tepi. Posisi diperbarui tiap frame.
  // Sisi belakang punya UV sendiri, jadi tulisan terbaca benar dari kedua sisi (tidak terbalik).
  const strapGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = SEG + 1
    const position = new THREE.BufferAttribute(new Float32Array(n * VPS * 3), 3)
    const normal = new THREE.BufferAttribute(new Float32Array(n * VPS * 3), 3)
    position.setUsage(THREE.DynamicDrawUsage)
    normal.setUsage(THREE.DynamicDrawUsage)
    const uv = new Float32Array(n * VPS * 2)
    for (let i = 0; i < n; i++) {
      // Teks dibaca dari atas ke bawah. i = 0 adalah ujung klip (bawah).
      const u = (1 - i / SEG) * UV_SCALE
      const edge = 0.08 // tepi tali memakai warna pita merah
      const vs = [1, 0, 0, 1, edge, edge, edge, edge]
      for (let k = 0; k < VPS; k++) uv.set([u, vs[k]], (i * VPS + k) * 2)
    }
    const index = []
    for (let i = 0; i < SEG; i++) {
      const a = i * VPS
      const b = (i + 1) * VPS
      index.push(a, b, a + 1, a + 1, b, b + 1) // depan
      index.push(a + 2, a + 3, b + 2, a + 3, b + 3, b + 2) // belakang
      index.push(a + 5, b + 5, a + 4, a + 4, b + 5, b + 4) // tepi kanan
      index.push(a + 6, b + 6, a + 7, a + 7, b + 6, b + 7) // tepi kiri
    }
    g.setAttribute('position', position)
    g.setAttribute('normal', normal)
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    g.setIndex(index)
    return g
  }, [])

  useEffect(() => {
    textures.bump.repeat.set(1, 1)
  }, [textures])

  useEffect(() => {
    if (hovered || grabbing) {
      document.body.style.cursor = grabbing ? 'grabbing' : 'grab'
      return () => {
        document.body.style.cursor = 'auto'
      }
    }
  }, [hovered, grabbing])

  useEffect(() => () => sim.release(), [sim])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)

    // Titik gantung mengikuti ukuran layar.
    if (Math.abs(sim.anchor.x - offsetX) > 1e-4) sim.shiftX(offsetX - sim.anchor.x)

    // Kamera bergeser sedikit mengikuti kursor: memberi kesan kedalaman 3D.
    const cam = tmp.cam
    cam.x += (state.pointer.x * 0.5 - cam.x) * Math.min(1, dt * 2.5)
    cam.y += (state.pointer.y * 0.25 - cam.y) * Math.min(1, dt * 2.5)
    camera.position.set(offsetX * 0.35 + cam.x, cam.y, 10.5)
    camera.lookAt(offsetX * 0.35, 0, 0)
    camera.updateMatrixWorld()

    // Kartu mengikuti kursor saat ditarik: titik yang dipegang diarahkan ke kursor.
    if (drag.current) {
      const { ray, dir } = tmp
      ray.set(state.pointer.x, state.pointer.y, 0.5).unproject(camera)
      dir.copy(ray).sub(camera.position).normalize()
      const t = (drag.current.z - camera.position.z) / dir.z
      sim.dragTo(camera.position.x + dir.x * t, camera.position.y + dir.y * t)
    }

    sim.step(dt)

    const { P, idx, yaw } = sim
    const { m, a, x, y, z, pts } = tmp

    // Kartu: kerangka kaku dari empat sudutnya.
    const f = sim.frame()
    if (cardRef.current) {
      x.set(f.r.x, f.r.y, f.r.z)
      y.set(f.u.x, f.u.y, f.u.z)
      z.set(f.n.x, f.n.y, f.n.z)
      m.makeBasis(x, y, z).setPosition(f.c.x, f.c.y, f.c.z)
      cardRef.current.matrix.copy(m)
      cardRef.current.matrixWorldNeedsUpdate = true
    }

    // Klip: ruas dari ujung tali ke bawah, ikut terpuntir bersama kartu.
    const end = P[idx.end]
    const cb = P[idx.clipBottom]
    const slot = P[idx.slot]
    if (clipRef.current) {
      a.set(end.x - cb.x, end.y - cb.y, end.z - cb.z)
      yawBasis(a, yaw.u, x, y, z)
      m.makeBasis(x, y, z).setPosition((end.x + cb.x) / 2, (end.y + cb.y) / 2, (end.z + cb.z) / 2)
      clipRef.current.matrix.copy(m)
      clipRef.current.matrixWorldNeedsUpdate = true
    }

    // Cincin: ruas dari mata kait klip ke lubang kartu.
    if (ringRef.current) {
      a.set(cb.x - slot.x, cb.y - slot.y, cb.z - slot.z)
      yawBasis(a, yaw.u + RING_ANG, x, y, z)
      m.makeBasis(x, y, z).setPosition((cb.x + slot.x) / 2, (cb.y + slot.y) / 2, (cb.z + slot.z) / 2)
      ringRef.current.matrix.copy(m)
      ringRef.current.matrixWorldNeedsUpdate = true
    }

    // Tali: kurva halus melewati titik-titik rantai (dari klip ke titik gantung).
    for (let i = 0; i <= 8; i++) {
      const p = P[8 - i]
      curve.points[i].set(p.x, p.y, p.z)
    }
    for (let i = 0; i <= SEG; i++) curve.getPoint(i / SEG, pts[i])
    const pos = strapGeo.attributes.position.array
    const nor = strapGeo.attributes.normal.array
    const hw = (STRAP_W / 2) * Math.min(1, Math.max(0.72, 1 / Math.sqrt(1 + Math.max(0, sim.strapStrain() - 0.045))))
    for (let i = 0; i <= SEG; i++) {
      const p = pts[i]
      const p0 = pts[Math.max(i - 1, 0)]
      const p1 = pts[Math.min(i + 1, SEG)]
      a.set(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z)
      // Puntiran penuh di dekat klip, hilang menuju titik gantung.
      const th = yaw.u * (1 - smoothstep(0, 0.8, i / SEG))
      yawBasis(a, th, x, y, z)
      const ox = x.x * hw
      const oy = x.y * hw
      const oz = x.z * hw
      const tx = z.x * STRAP_T
      const ty = z.y * STRAP_T
      const tz = z.z * STRAP_T
      // sudut: [kanan/depan, kiri/depan, kanan/belakang, kiri/belakang, lalu tepi kanan dan kiri]
      const c = [
        [p.x + ox + tx, p.y + oy + ty, p.z + oz + tz],
        [p.x - ox + tx, p.y - oy + ty, p.z - oz + tz],
        [p.x + ox - tx, p.y + oy - ty, p.z + oz - tz],
        [p.x - ox - tx, p.y - oy - ty, p.z - oz - tz],
      ]
      const order = [0, 1, 2, 3, 0, 2, 1, 3]
      const nrm = [
        [z.x, z.y, z.z],
        [z.x, z.y, z.z],
        [-z.x, -z.y, -z.z],
        [-z.x, -z.y, -z.z],
        [x.x, x.y, x.z],
        [x.x, x.y, x.z],
        [-x.x, -x.y, -x.z],
        [-x.x, -x.y, -x.z],
      ]
      for (let k = 0; k < VPS; k++) {
        const o = (i * VPS + k) * 3
        const cc = c[order[k]]
        pos[o] = cc[0]
        pos[o + 1] = cc[1]
        pos[o + 2] = cc[2]
        nor[o] = nrm[k][0]
        nor[o + 1] = nrm[k][1]
        nor[o + 2] = nrm[k][2]
      }
    }
    strapGeo.attributes.position.needsUpdate = true
    strapGeo.attributes.normal.needsUpdate = true
    strapGeo.computeBoundingSphere()
  })

  const release = (e) => {
    e.target.releasePointerCapture?.(e.pointerId)
    drag.current = null
    sim.release()
    setGrabbing(false)
  }

  const onDown = (e) => {
    e.stopPropagation()
    e.target.setPointerCapture?.(e.pointerId)
    drag.current = {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
      t: performance.now(),
      z: e.point.z,
    }
    sim.grabAt(e.point.x, e.point.y, e.point.z)
    setGrabbing(true)
  }

  const onUp = (e) => {
    const d = drag.current
    release(e)
    // Klik singkat tanpa geser = balik kartu.
    if (d) {
      const moved = Math.hypot(e.nativeEvent.clientX - d.x, e.nativeEvent.clientY - d.y)
      if (moved < 6 && performance.now() - d.t < 400) {
        flipped.current = !flipped.current
        sim.flip(flipped.current ? 1 : -1)
      }
    }
  }

  const metal = { color: '#cfd3dc', metalness: 1, roughness: 0.24, envMapIntensity: 1.9 }

  // Permukaan kartu: PVC laminasi. Ada lapisan kilap (clearcoat) yang memantulkan cahaya
  // dan bergeser saat kartu berayun, jadi tidak lagi terlihat seperti stiker datar.
  const faceMat = (map) => ({
    map,
    emissiveMap: map,
    emissive: '#ffffff',
    emissiveIntensity: 0.3,
    roughness: 0.62,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    envMapIntensity: 0.25,
    toneMapped: false,
  })

  return (
    <>
      {/* Kartu */}
      <group ref={cardRef} matrixAutoUpdate={false}>
        <group
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onLostPointerCapture={() => {
            drag.current = null
            sim.release()
            setGrabbing(false)
          }}
        >
          {/* Badan kartu bertebal dengan lubang sungguhan dan tepi miring */}
          <mesh geometry={slab} castShadow>
            <meshPhysicalMaterial color="#e3e4ea" roughness={0.38} metalness={0} clearcoat={0.6} clearcoatRoughness={0.2} />
          </mesh>
          <mesh geometry={face} position-z={CARD_T / 2 + 0.002} receiveShadow>
            <meshPhysicalMaterial {...faceMat(textures.front)} />
          </mesh>
          <mesh geometry={face} position-z={-(CARD_T / 2 + 0.002)} rotation-y={Math.PI} receiveShadow>
            <meshPhysicalMaterial {...faceMat(textures.back)} />
          </mesh>
        </group>
      </group>

      {/* Klip logam: badan + celah tempat tali masuk + mata kait yang mengait cincin */}
      <group ref={clipRef} matrixAutoUpdate={false}>
        <RoundedBox args={[0.38, 0.14, 0.09]} radius={0.03} smoothness={4} position={[0, 0.03, 0]} castShadow>
          <meshStandardMaterial {...metal} />
        </RoundedBox>
        <mesh position={[0, 0.099, 0]}>
          <boxGeometry args={[0.3, 0.012, 0.094]} />
          <meshStandardMaterial color="#14161d" roughness={0.6} />
        </mesh>
        <mesh position={[0, -CLIP_LEN / 2 + EYE_R - 0.04, 0]} rotation-y={RING_ANG + Math.PI / 2} castShadow>
          <torusGeometry args={[EYE_R, EYE_TUBE, 16, 48]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      </group>

      {/* Cincin: menembus lubang kartu dan mengait di mata kait klip */}
      <group ref={ringRef} matrixAutoUpdate={false}>
        <mesh castShadow>
          <torusGeometry args={[RING_LEN / 2, RING_TUBE, 24, 64]} />
          <meshStandardMaterial {...metal} color="#dfe2e9" roughness={0.2} />
        </mesh>
      </group>

      {/* Tali */}
      <mesh geometry={strapGeo} frustumCulled={false} castShadow>
        <meshPhysicalMaterial
          map={textures.band}
          bumpMap={textures.bump}
          bumpScale={1.2}
          emissiveMap={textures.band}
          emissive="#ffffff"
          emissiveIntensity={0.3}
          roughness={0.85}
          metalness={0}
          sheen={1}
          sheenRoughness={0.45}
          sheenColor="#ffffff"
          envMapIntensity={0.15}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}

// Memberi tahu layar loading bahwa scene sudah merender beberapa frame (shader sudah
// dikompilasi dan tekstur kartu sudah naik ke GPU), jadi tidak patah-patah saat web terbuka.
function ReadySignal() {
  const frames = useRef(0)
  useEffect(() => {
    const t = setTimeout(markScene, 6000) // cadangan kalau frame tidak jalan (misal tab tersembunyi)
    return () => clearTimeout(t)
  }, [])
  useFrame(() => {
    if (!cardsReady()) return
    frames.current += 1
    if (frames.current === 20) markScene()
  })
  return null
}

export default function Lanyard() {
  const wrap = useRef(null)
  const [visible, setVisible] = useState(true)
  const webgl = useMemo(() => supportsWebGL(), [])

  // Tanpa WebGL tidak ada yang perlu dimuat, jadi layar loading boleh langsung selesai.
  useEffect(() => {
    if (!webgl) {
      markCard('front')
      markCard('back')
      markScene()
    }
  }, [webgl])

  // Hentikan render saat Home tidak terlihat supaya hemat baterai.
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(wrap.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrap} className="lanyard-wrap">
      {webgl ? (
        <Canvas
          shadows
          camera={{ position: [0, 0, 10.5], fov: 25 }}
          dpr={[1, 1.75]}
          frameloop={visible ? 'always' : 'never'}
          gl={{ alpha: true, antialias: true }}
          style={{ touchAction: 'pan-y' }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[3, 4, 6]}
            intensity={0.9}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-4}
            shadow-camera-right={4}
            shadow-camera-top={5}
            shadow-camera-bottom={-4}
            shadow-camera-near={1}
            shadow-camera-far={20}
            shadow-bias={-0.0004}
            shadow-normalBias={0.02}
            shadow-radius={3}
          />
          <directionalLight position={[-4, -1, 3]} intensity={0.3} color="#ff9d93" />
          <Suspense fallback={null}>
            <Band />
          </Suspense>
          <ReadySignal />
          <Environment blur={0.4}>
            <color attach="background" args={['black']} />
            <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
            <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
            <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
            <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
            <Lightformer intensity={4} color="#ffe4df" position={[0, 5, 3]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 4, 1]} />
            <Lightformer intensity={2.5} color="#ffd9d0" position={[6, 0, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 3, 1]} />
          </Environment>
        </Canvas>
      ) : (
        <div className="lanyard-fallback">Browser kamu tidak mendukung WebGL, jadi kartu 3D tidak ditampilkan.</div>
      )}
    </div>
  )
}
