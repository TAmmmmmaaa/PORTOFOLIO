import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FiMoon, FiSun, FiVolume2, FiVolumeX } from 'react-icons/fi'
import { scrollToSection } from '../lib/scroll'
import { setSoundEnabled, useSoundEnabled } from '../lib/sound'

// Navbar pill melayang dengan indikator yang bergeser mengikuti section aktif.
export default function Navbar({ sections, theme, onToggleTheme }) {
  const [active, setActive] = useState(sections[0].id)
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false })
  const items = useRef({})
  const soundOn = useSoundEnabled()

  // Scroll-spy: section yang melewati garis tengah layar menjadi aktif.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  useLayoutEffect(() => {
    const measure = () => {
      const el = items.current[active]
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active])

  return (
    <nav className="nav" aria-label="Navigasi utama">
      <div className="nav-inner">
        <span
          className="nav-pill"
          style={{ left: pill.left, width: pill.width, opacity: pill.ready ? 1 : 0 }}
          aria-hidden="true"
        />
        {sections.map((s) => (
          <button
            key={s.id}
            ref={(el) => (items.current[s.id] = el)}
            className="nav-link"
            aria-current={active === s.id ? 'true' : undefined}
            onClick={() => scrollToSection(s.id)}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          className="theme-toggle sound-toggle"
          data-no-click-sound
          onClick={() => setSoundEnabled(!soundOn)}
          aria-pressed={soundOn}
          aria-label={soundOn ? 'Matikan suara klik' : 'Nyalakan suara klik'}
          title={soundOn ? 'Suara: aktif' : 'Suara: mati'}
        >
          {soundOn ? <FiVolume2 /> : <FiVolumeX />}
        </button>
        <button
          type="button"
          className="theme-toggle theme-toggle-next"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
          title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
        >
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </button>
      </div>
    </nav>
  )
}
