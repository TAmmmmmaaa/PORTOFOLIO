import { supabase } from '../config'

// Komentar disimpan di tabel `comments` (lihat supabase-comments.sql).
// Memakai REST API Supabase langsung, jadi tidak perlu library tambahan.
const BASE = `${supabase.url}/rest/v1/comments`
const headers = { apikey: supabase.key, 'Content-Type': 'application/json' }

export async function fetchComments(limit = 50) {
  const res = await fetch(`${BASE}?select=id,name,message,created_at&order=created_at.desc&limit=${limit}`, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Aturan anti-spam di database (lihat supabase-comments.sql) menolak dengan pesan
// bertanda `rate_limit` atau `too_many_links`. Di sini diubah jadi error yang mudah dibaca.
export async function postComment({ name, message }) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ name: name.trim(), message: message.trim() }),
  })
  if (res.ok) return
  let code = ''
  try {
    const body = await res.json()
    code = String(body?.message || '')
  } catch {
    /* abaikan: respons bukan JSON */
  }
  const err = new Error(code || `HTTP ${res.status}`)
  err.code = code.includes('rate_limit') ? 'rate_limit' : code.includes('too_many_links') ? 'too_many_links' : 'other'
  throw err
}
