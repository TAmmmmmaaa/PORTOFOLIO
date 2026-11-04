# Portofolio Tama Rachidi

React + Vite + React Three Fiber (Three.js + Rapier) + GSAP. Komentar disimpan di Supabase.

## Menjalankan

```bash
npm install
npm run dev      # buka alamat yang muncul di terminal
npm run build    # hasil produksi ada di folder dist
```

## Isi website

- **Loading**: layar 0 sampai 100% yang menunggu gambar, kode kartu 3D, tekstur kartu, dan scene 3D siap merender, supaya kartu tidak patah-patah saat web terbuka.
- **Home**: latar hidup (dua tema, lihat bagian Tema), navbar pill dengan tombol ganti mode, efek ketik, tombol sosmed (GitHub, LinkedIn, TikTok), dan **lanyard 3D**. Kartu bisa ditarik dengan mouse (fisika Rapier) dan **klik singkat membalik** kartu depan/belakang.
- **About**: foto dengan efek reveal (arahkan kursor ke foto), **Education** berisi riwayat pendidikan dengan logo sekolah, dan pemutar musik.
- **Portfolio**: tab Projects dan Tech Stack. Selama `projects` di config masih kosong, yang tampil kartu "Proyek sedang dalam tahap pengerjaan".
- **Contact**: kolom komentar publik (Supabase) dan kartu kontak.

## Tema: dark dan light

Tombol matahari/bulan di navbar mengganti mode. Mode awal mengikuti pengaturan HP/laptop, dan pilihan pengunjung diingat di browser (`localStorage`, kunci `tama-theme`). Kedua mode didominasi merah, dan latarnya digambar di canvas oleh `src/components/Background.jsx`.

- **Dark: badai malam.** Awan gelap berlapis yang bergerak, petir merah bercabang yang menerangi awan di sekitarnya (kadang menyambar dua kali, kadang hanya kilat di dalam awan), hujan tipis, kabut merah di cakrawala, dan getaran kecil saat "gemuruh". Gemuruh hanya visual, tidak ada suara. Kode: `src/lib/bg/storm.js`.
- **Light: langit galaxy hangat.** Gradien merah, oranye, pink dengan nebula melayang dan pita galaksi, bintang kecil berkelip, matahari yang bergerak melengkung dengan cincin zodiak, rasi zodiak yang muncul dan menghilang bergantian (bentuknya disederhanakan, bukan peta bintang akurat), planet yang hancur dengan inti retak berlava dan serpihan yang mengorbit, aliran batu angkasa, serta bintang jatuh dan komet. Kode: `src/lib/bg/galaxy.js`, data rasi di `src/lib/bg/zodiac.js`.
- **Warna UI** (tombol, garis, teks gradien) diatur lewat variabel di bagian atas `src/styles.css`, satu set untuk `[data-theme='dark']` dan satu untuk `[data-theme='light']`. Mau ganti warna? Ubah variabel di sana.

Ramah perangkat: animasi berhenti saat tab tersembunyi, resolusi canvas dibatasi, jumlah efek dikurangi di HP, dan kalau frame terus lambat efeknya otomatis dikurangi. Kalau pengunjung mengaktifkan "kurangi gerakan" di sistemnya, latar tampil sebagai gambar diam.

## Yang perlu kamu ganti

Hampir semua teks, link, dan path gambar ada di `src/config.js`.

| Aset | Letakkan di | Catatan |
| --- | --- | --- |
| Foto dirimu | `public/me.webp` | Latar transparan (cutout). Ubah `images.photo` di config. |
| Foto kostum | `public/me-costume.webp` | **Ukuran piksel dan pose sama persis** dengan foto pertama, supaya menumpuk rapi. Ubah `images.photoAlt`. |
| Kartu depan | `public/card-front.webp` | Rasio 1024x1455 (portrait). Kalau tidak ada, dipakai desain placeholder. |
| Kartu belakang | `public/card-back.webp` | Rasio sama. Placeholder berisi pola mirip QR (bukan QR sungguhan). |
| Logo sekolah/kampus | `public/logos/` | Format apa saja (webp, png, svg). Kalau file tidak ada, tampil huruf singkatan. |
| Gambar preview link | `public/og-image.jpg` | 1200x630, bertema badai merah. Tampil saat link dibagikan (lihat bagian Open Graph). |

Catatan untuk kartu: sisi atas kartu tertutup klip logam dan ada lubang gantungan sekitar 130 piksel dari atas, jadi jangan taruh teks penting di area itu.

### Menambah proyek

Isi array `projects` di `src/config.js` (contohnya ada di komentar dalam file itu). Taruh screenshot di `public/projects/`. Kalau `demo` atau `github` dikosongkan, tombolnya otomatis tidak muncul.

## Komentar (Supabase)

1. Buka Supabase, masuk ke **SQL Editor**, tempel isi `supabase-comments.sql`, lalu **Run**. File ini aman dijalankan berulang kali, jadi jalankan lagi setiap kali file ini diperbarui.
2. Kunci akses di `src/config.js` adalah kunci *publishable*, yang memang aman ada di website. Yang menjaga data adalah aturan RLS di database. Kalau mau, isi lewat `VITE_SUPABASE_URL` dan `VITE_SUPABASE_KEY` di pengaturan Vercel.

Perlindungan spam berlapis:

- **Di browser**: kolom jebakan tersembunyi (honeypot) dan jeda kirim.
- **Di database** (tidak bisa dilewati dengan mengosongkan localStorage): maksimal 1 komentar per 30 detik dan 10 per jam dari satu IP, pesan yang sama persis tidak boleh diulang dalam 10 menit, maksimal 2 tautan per pesan, dan batas keseluruhan 20 komentar per menit. Angkanya bisa diubah di fungsi `comments_guard` dalam file SQL.
- Pengunjung hanya bisa membaca dan menambah komentar, tidak bisa mengubah atau menghapus. Hapus komentar yang tidak diinginkan lewat dashboard Supabase.

## Open Graph (preview saat link dibagikan)

Tag Open Graph dan Twitter card ada di `index.html`, dan gambarnya `public/og-image.jpg`. Preview butuh alamat web yang lengkap, dan alamat itu terisi otomatis lewat `vite.config.js`:

- Di **Vercel**: otomatis memakai alamat produksi proyek, tidak perlu mengatur apa pun.
- Di tempat lain: set variabel lingkungan `SITE_URL`, misalnya `https://nama-kamu.vercel.app`.
- Sebelum deploy: gambar memakai path relatif, jadi preview belum akan muncul di WhatsApp dan sejenisnya. Ini normal.

Setelah deploy, cek hasilnya dengan menempelkan link di WhatsApp atau LinkedIn Post Inspector. Platform menyimpan cache preview, jadi kalau gambar diganti, perlu waktu atau paksa segarkan lewat alat inspeksi masing-masing.

## Struktur

```
src/
  config.js              teks, link sosmed, pendidikan, proyek, path gambar
  App.jsx                susunan halaman + layar loading
  components/
    Loader.jsx           layar loading 0-100%
    Background.jsx       latar hidup: badai merah (dark) / langit galaxy (light)
    Navbar.jsx           navbar pill + scroll-spy
    Hero.jsx             halaman utama
    Lanyard.jsx          scene 3D: fisika tali, drag, flip kartu
    About.jsx            section About
    Education.jsx        timeline pendidikan
    SpiderReveal.jsx     efek mask foto mengikuti kursor
    Portfolio.jsx        tab Projects dan Tech Stack
    Contact.jsx          komentar dan kartu kontak
    Music.jsx            pemutar musik
  lib/
    theme.js             hook tema dark/light (ingat pilihan, ikut sistem)
    bg/storm.js          adegan badai petir merah
    bg/galaxy.js         adegan langit galaxy
    bg/zodiac.js         data 12 rasi zodiak
    cardAssets.js        geometri kartu + tekstur
    lanyardSim.js        simulasi fisika tali
    loadState.js         penanda status loading kartu 3D
    comments.js          akses komentar ke Supabase
supabase-comments.sql    tabel komentar + aturan keamanan + anti-spam
```
