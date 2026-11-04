import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FiMail, FiMessageCircle, FiSend, FiUsers } from 'react-icons/fi'
import { FaGithub, FaLinkedinIn, FaTiktok } from 'react-icons/fa6'
import { contact, profile } from '../config'
import { fetchComments, postComment } from '../lib/comments'

gsap.registerPlugin(ScrollTrigger)

const SOCIALS = [
  { key: 'github', label: 'GitHub', Icon: FaGithub },
  { key: 'linkedin', label: 'LinkedIn', Icon: FaLinkedinIn },
  { key: 'tiktok', label: 'TikTok', Icon: FaTiktok },
]

// Membuka aplikasi email pengunjung. Alamat dirakit di sini, bukan ditulis di halaman.
function openMail() {
  const [user, host] = contact.email
  window.location.href = `mailto:${user}@${host}?subject=${encodeURIComponent(contact.subject)}`
}

const COOLDOWN_MS = 20000
const rtf = new Intl.RelativeTimeFormat('id', { numeric: 'auto' })

function timeAgo(iso) {
  const sec = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const abs = Math.abs(sec)
  if (abs < 45) return 'baru saja'
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(sec / 86400), 'day')
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function readLast() {
  try {
    return Number(localStorage.getItem('tama-comment-last')) || 0
  } catch {
    return 0
  }
}

export default function Contact() {
  const root = useRef(null)
  const [comments, setComments] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [trap, setTrap] = useState('') // kolom jebakan untuk bot
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState(null) // { type: 'ok' | 'err', text }

  const load = useCallback(async () => {
    try {
      setComments(await fetchComments())
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.contact-anim', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.14,
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: root.current, start: 'top 70%', toggleActions: 'play none none none' },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (sending) return
    if (trap) return // bot: pura-pura berhasil
    const n = name.trim()
    const m = message.trim()
    if (!n || !m) {
      setNotice({ type: 'err', text: 'Nama dan pesan wajib diisi.' })
      return
    }
    const wait = COOLDOWN_MS - (Date.now() - readLast())
    if (wait > 0) {
      setNotice({ type: 'err', text: `Tunggu ${Math.ceil(wait / 1000)} detik sebelum mengirim lagi.` })
      return
    }
    setSending(true)
    setNotice(null)
    try {
      await postComment({ name: n, message: m })
      try {
        localStorage.setItem('tama-comment-last', String(Date.now()))
      } catch {
        /* abaikan: penyimpanan browser mati */
      }
      setMessage('')
      setNotice({ type: 'ok', text: 'Terkirim, terima kasih!' })
      await load()
    } catch (err) {
      const text =
        err.code === 'rate_limit'
          ? 'Terlalu sering mengirim. Coba lagi beberapa menit lagi.'
          : err.code === 'too_many_links'
            ? 'Pesan berisi terlalu banyak tautan, jadi ditolak.'
            : 'Gagal mengirim. Coba lagi sebentar lagi.'
      setNotice({ type: 'err', text })
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="contact" className="contact" ref={root}>
      <h2 className="section-title contact-anim">Contact</h2>
      <p className="section-sub contact-anim">Tinggalkan komentar atau hubungi saya langsung.</p>

      <div className="contact-grid">
        <div className="contact-card chat contact-anim">
          <h3 className="contact-h">
            <FiMessageCircle /> Komentar
          </h3>

          <form className="chat-form" onSubmit={submit} noValidate>
            <label className="field">
              <span>Nama</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="Nama kamu"
                autoComplete="nickname"
              />
            </label>
            <label className="field">
              <span>Pesan</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Tulis sesuatu..."
              />
              <small>{message.length}/500</small>
            </label>
            {/* Kolom jebakan: manusia tidak melihatnya, bot biasanya mengisinya. */}
            <input
              className="hp"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={trap}
              onChange={(e) => setTrap(e.target.value)}
            />
            <div className="chat-actions">
              <button className="btn btn-primary" type="submit" disabled={sending}>
                {sending ? 'Mengirim...' : 'Kirim'} <FiSend />
              </button>
              {notice && (
                <span className={`notice notice-${notice.type}`} role="status">
                  {notice.text}
                </span>
              )}
            </div>
          </form>

          <ul className="chat-list" aria-live="polite">
            {status === 'loading' && <li className="chat-empty">Memuat komentar...</li>}
            {status === 'error' && (
              <li className="chat-empty">
                Komentar belum bisa dimuat.{' '}
                <button type="button" className="link-btn" onClick={load}>
                  Coba lagi
                </button>
              </li>
            )}
            {status === 'ready' && comments.length === 0 && <li className="chat-empty">Belum ada komentar. Jadilah yang pertama!</li>}
            {status === 'ready' &&
              comments.map((c) => (
                <li key={c.id} className="chat-item">
                  <span className="avatar" aria-hidden="true">
                    {(c.name || '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="chat-meta">
                      <strong>{c.name}</strong> <time dateTime={c.created_at}>{timeAgo(c.created_at)}</time>
                    </p>
                    <p className="chat-text">{c.message}</p>
                  </div>
                </li>
              ))}
          </ul>
        </div>

        <aside className="contact-side">
          <div className="contact-card contact-anim">
            <h3 className="contact-h">
              <FiSend /> Hubungi
            </h3>
            <p className="side-text">{contact.text}</p>
            <button type="button" className="btn btn-primary" onClick={openMail}>
              <FiMail /> {contact.label}
            </button>
          </div>

          <div className="contact-card contact-anim">
            <h3 className="contact-h">
              <FiUsers /> Find Me
            </h3>
            <div className="find-me">
              {SOCIALS.map(({ key, label, Icon }) => (
                <a key={key} className="social" href={profile.socials[key]} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon />
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>

    </section>
  )
}
