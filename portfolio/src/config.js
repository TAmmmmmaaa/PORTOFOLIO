// Semua teks dan aset yang perlu kamu ganti ada di file ini.

export const profile = {
  name: 'Tama Rachidi',
  role: 'Junior Developer',
  typingWords: ['Web Developer', 'UI/UX Enthusiast', 'Creative Coder'],
  heroText:
    'Mahasiswa Teknik Informatika yang suka mengubah ide menjadi web yang terasa hidup: rapi di kode, nyaman dipakai, dan punya sentuhan interaksi 3D.',
  // Tanda ** ** membuat teks tebal.
  aboutParagraphs: [
    'Kenalin, nama gw **Tama Rachidi**, manusia biasa dari Aceh. Gw mahasiswa **Teknik Informatika (IT)** di Universitas Jabal Ghafur yang baru terjun ke dunia pemrograman dan coding.',
    'Alasan gw suka pemrograman simpel: imajinasi gw yang liar dulu selalu terpendam. Lewat coding, gw bisa mewujudkan imajinasi yang dulu belum tercapai, termasuk bereksperimen dengan kode.',
  ],
  socials: {
    github: 'https://github.com/TAmmmmmaaa',
    linkedin: 'https://www.linkedin.com/in/tama-chid-7a4368435/',
    tiktok: 'https://www.tiktok.com/@rachii_meath',
    discord: 'https://discord.gg/apnfBXbED',
    instagram: 'https://www.instagram.com/rachii_impos/',
  },
  // Letakkan file gambar di folder /public lalu sesuaikan path-nya di sini.
  images: {
    photo: '/me.webp', // foto dengan jaket kampus
    photoAlt: '/me-costume.webp', // foto kostum Akatsuki (muncul saat kursor di atas foto)
    cardFront: '/card-front.webp', // sisi depan kartu (opsional, 1024x1455)
    cardBack: '/card-back.webp', // sisi belakang kartu (opsional, 1024x1455)
  },
}

// Riwayat pendidikan, urut dari yang terbaru. `logo` boleh dikosongkan:
// kalau file belum ada, yang tampil adalah huruf singkatan.
export const education = [
  {
    school: 'Universitas Jabal Ghafur',
    detail: 'Teknik Informatika',
    period: 'Sedang berjalan',
    badge: 'UJG',
    logo: '/logos/ujg.png',
  },
  {
    school: 'SMA Negeri 1 Indrajaya',
    detail: 'Sekolah Menengah Atas',
    period: '2021 – 2024',
    badge: 'SMA',
    logo: '/logos/sma.webp',
  },
  {
    school: 'SMP Negeri 2 Sigli',
    detail: 'Sekolah Menengah Pertama',
    period: '2018 – 2021',
    badge: 'SMP',
    logo: '/logos/smp.svg',
  },
]

// Proyek yang ditampilkan di tab Projects. Kalau daftar ini kosong, yang tampil
// adalah kartu "Proyek sedang dalam tahap pengerjaan".
// image: letakkan screenshot di /public/projects. Kalau file belum ada, tampil gambar sementara.
// demo / github: kosongkan ('') kalau belum ada, tombolnya otomatis tidak ditampilkan.
export const projects = []
// Contoh isi kalau nanti sudah ada proyek (hapus tanda // lalu taruh di dalam tanda [ ] di atas):
// {
//   title: 'NAMA PROYEK',
//   description: 'Jelaskan apa yang dibangun, pakai teknologi apa, dan masalah apa yang diselesaikan.',
//   tags: ['React', 'Supabase'],
//   image: '/projects/nama-proyek.jpg',
//   demo: 'https://...',
//   github: 'https://github.com/TAmmmmmaaa/nama-repo',
// },

// Tech Stack. `icon` harus salah satu kunci di ICONS (src/components/Portfolio.jsx).
export const techStack = [
  { name: 'React', icon: 'react' },
  { name: 'JavaScript', icon: 'javascript' },
  { name: 'HTML5', icon: 'html5' },
  { name: 'CSS3', icon: 'css3' },
  { name: 'Three.js', icon: 'threejs' },
  { name: 'GSAP', icon: 'gsap' },
  { name: 'Supabase', icon: 'supabase' },
  { name: 'Vite', icon: 'vite' },
  { name: 'Git', icon: 'git' },
  { name: 'GitHub', icon: 'github' },
  { name: 'Vercel', icon: 'vercel' },
]

// Bagian musik. Ganti `playlistId` dengan ID dari link Spotify:
// open.spotify.com/playlist/<ID>?si=...  (bisa juga lagu: ganti type jadi 'track')
export const music = {
  type: 'playlist',
  id: '149Ypyg8Uh1tdndaHesda5',
  url: 'https://open.spotify.com/playlist/149Ypyg8Uh1tdndaHesda5',
}

// Daftar section untuk navbar. Section baru tinggal ditambahkan di sini.
export const sections = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'education', label: 'Education' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'contact', label: 'Contact' },
]

// Supabase (untuk kolom komentar). Kunci "publishable" memang aman ada di website:
// yang menjaga data adalah aturan RLS di database, bukan kerahasiaan kunci ini.
// Kalau mau, isi lewat VITE_SUPABASE_URL dan VITE_SUPABASE_KEY di pengaturan Vercel.
export const supabase = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://ylelyekumpfebgcykpbq.supabase.co',
  key: import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_velVzTkEGqd9TOwo9c8ycg_l86r0PJo',
}

// Kartu "Hubungi" di section Contact. Alamat email sengaja dipecah dua dan baru
// dirakit saat tombol diklik, supaya tidak muncul sebagai teks di halaman (anti-bot spam).
export const contact = {
  text: 'Punya proyek, ide, atau sekadar ingin menyapa? Kirim pesan langsung, saya senang mengobrol.',
  label: 'Kirim Email',
  subject: 'Halo dari portofolio kamu',
  email: ['tamar4ch', 'gmail.com'],
}

// Footer di bagian paling bawah halaman.
export const footer = {
  brand: 'Tama.rc',
  texts: [
    'Sedang merintis jalan menjadi web developer. Terbuka untuk kritik, saran, dan proyek belajar.',
    'Dibuat dengan penuh rasa penasaran, segelas kopi dikombinasi udud, dan tutorial yang dibantu Ai+YouTube.',
  ],
  // id harus sama dengan id section di halaman.
  links: [
    { id: 'home', label: 'Beranda' },
    { id: 'about', label: 'Tentang Saya' },
    { id: 'portfolio', label: 'Portofolio' },
    { id: 'contact', label: 'Kontak' },
  ],
}
