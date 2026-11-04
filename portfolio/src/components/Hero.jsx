import { lazy, Suspense, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { FiArrowRight, FiSend } from 'react-icons/fi'
import { FaGithub, FaLinkedinIn, FaTiktok } from 'react-icons/fa6'
import { profile } from '../config'
import useTypewriter from '../hooks/useTypewriter'
import { scrollToSection } from '../lib/scroll'

// Lanyard 3D cukup berat (Three.js + fisika), jadi dimuat terpisah.
const Lanyard = lazy(() => import('./Lanyard'))

const SOCIALS = [
  { key: 'github', label: 'GitHub', Icon: FaGithub },
  { key: 'linkedin', label: 'LinkedIn', Icon: FaLinkedinIn },
  { key: 'tiktok', label: 'TikTok', Icon: FaTiktok },
]

export default function Hero({ ready = true }) {
  const root = useRef(null)
  const typed = useTypewriter(profile.typingWords)

  useEffect(() => {
    if (!ready) return undefined
    const ctx = gsap.context(() => {
      gsap.from('.hero-anim', {
        y: 36,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
        delay: 0.1,
      })
    }, root)
    return () => ctx.revert()
  }, [ready])

  return (
    <section id="home" className="hero" ref={root}>
      <div className="hero-copy">
        <h1 className="hero-title hero-anim">
          <span className="grad">Welcome to</span>
          <br />
          My Portfolio
        </h1>

        <p className="typing hero-anim" aria-label={profile.typingWords.join(', ')}>
          <span aria-hidden="true">{typed}</span>
          <span className="caret" aria-hidden="true" />
        </p>

        <p className="hero-text hero-anim">{profile.heroText}</p>

        <div className="hero-actions hero-anim">
          <button className="btn btn-primary" onClick={() => scrollToSection('portfolio')}>
            Lihat Projek <FiArrowRight />
          </button>
          <button className="btn btn-ghost" onClick={() => scrollToSection('contact')}>
            Hubungi Saya <FiSend />
          </button>
        </div>

        <div className="find-me hero-anim">
          <span className="find-label">FIND ME</span>
          {SOCIALS.map(({ key, label, Icon }) => (
            <a
              key={key}
              className="social"
              href={profile.socials[key]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
            >
              <Icon />
            </a>
          ))}
        </div>
      </div>

      <div className="hero-lanyard">
        <Suspense fallback={null}>
          <Lanyard />
        </Suspense>
      </div>
    </section>
  )
}
