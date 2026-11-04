import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FiArrowUpRight, FiCode, FiFileText } from 'react-icons/fi'
import SpiderReveal from './SpiderReveal'
import Education from './Education'
import Music from './Music'
import { profile } from '../config'
import { scrollToSection } from '../lib/scroll'

gsap.registerPlugin(ScrollTrigger)

// Teks di antara ** ** ditebalkan.
function RichText({ text }) {
  return text.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))
}

export default function About() {
  const root = useRef(null)
  const [first, ...rest] = profile.name.split(' ')

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.about-anim', {
        y: 50,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.14,
        scrollTrigger: { trigger: root.current, start: 'top 65%', toggleActions: 'play none none none' },
      })
      gsap.from('.edu-anim', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.16,
        scrollTrigger: { trigger: '.edu', start: 'top 80%', toggleActions: 'play none none none' },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section id="about" className="about" ref={root}>
      <h2 className="section-title about-anim">About Me</h2>

      <div className="about-grid">
        <div className="about-left about-anim">
          <h3 className="hi">
            <span className="grad">Hi, I&apos;m</span>
            <br />
            {first}
            {rest.length > 0 && (
              <>
                <br />
                {rest.join(' ')}
              </>
            )}
          </h3>
          <button className="btn btn-primary" onClick={() => scrollToSection('contact')}>
            <FiFileText /> Hubungi Saya
          </button>
        </div>

        <div className="about-photo about-anim">
          <SpiderReveal base={profile.images.photo} alt={profile.images.photoAlt} label={`Foto ${profile.name}`} />
        </div>

        <div className="about-right about-anim">
          {profile.aboutParagraphs.map((p, i) => (
            <p key={i}>
              <RichText text={p} />
            </p>
          ))}
          <button className="btn btn-outline" onClick={() => scrollToSection('portfolio')}>
            <FiCode /> Lihat Projek <FiArrowUpRight />
          </button>
        </div>
      </div>

      <Education />
      <Music />
    </section>
  )
}
