import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Alamat web untuk tag Open Graph (preview link di WhatsApp, LinkedIn, dll).
// Urutan: SITE_URL (isi manual) > alamat produksi Vercel (otomatis saat deploy) > kosong.
// Kalau kosong, gambar preview memakai path relatif dan tag og:url tidak dibuat,
// jadi preview baru benar-benar bekerja setelah web di-deploy.
function siteUrl() {
  const raw = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || ''
  if (!raw) return ''
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withProto.replace(/\/+$/, '')
}

function openGraph() {
  return {
    name: 'open-graph-url',
    transformIndexHtml(html) {
      const site = siteUrl()
      return html
        .replaceAll('%SITE_URL%', site)
        .replace('<!--OG_URL-->', site ? `<meta property="og:url" content="${site}/" />` : '')
    },
  }
}

export default defineConfig({
  plugins: [react(), openGraph()],
})
