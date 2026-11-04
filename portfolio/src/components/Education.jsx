import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FiBookOpen } from 'react-icons/fi'
import { education } from '../config'

gsap.registerPlugin(ScrollTrigger)

// Logo sekolah. Kalau file belum ada, tampil huruf singkatan.
function Logo({ item }) {
  const [failed, setFailed] = useState(false)
  if (failed || !item.logo) {
    return (
      <span className="edu-badge" aria-hidden="true">
        {item.badge}
      </span>
    )
  }
  return (
    <img
      className="edu-logo"
      src={item.logo}
      alt={`Logo ${item.school}`}
      onError={() => setFailed(true)}
      draggable={false}
    />
  )
}

export default function Education() {
  const root = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.edu-title', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.edu-title', start: 'top 85%', toggleActions: 'play none none none' },
      })

      // Garis timeline "tumbuh" mengikuti scroll.
      gsap.fromTo(
        '.edu-line-fill',
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: '.edu-list', start: 'top 70%', end: 'bottom 60%', scrub: true },
        },
      )

      gsap.utils.toArray('.edu-item').forEach((el) => {
        gsap.from(el, {
          x: 60,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
        })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section id="education" className="education" ref={root}>
      <h2 className="section-title edu-title">Education</h2>
      <p className="section-sub edu-title">Perjalanan belajar saya sejauh ini.</p>

      <ol className="edu-list">
        <span className="edu-line" aria-hidden="true">
          <span className="edu-line-fill" />
        </span>
        {education.map((item) => (
          <li key={item.school} className="edu-item">
            <span className="edu-dot" aria-hidden="true">
              <FiBookOpen />
            </span>
            <article className="edu-card">
              <div className="edu-logo-box">
                <Logo item={item} />
              </div>
              <div className="edu-info">
                <span className="edu-period">{item.period}</span>
                <h3>{item.school}</h3>
                <p>{item.detail}</p>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  )
}
