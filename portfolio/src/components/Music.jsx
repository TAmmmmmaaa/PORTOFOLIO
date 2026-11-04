import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FiArrowUpRight, FiMusic } from 'react-icons/fi'
import { music } from '../config'

gsap.registerPlugin(ScrollTrigger)

// Pemutar Spotify. Pengunjung tanpa login Spotify hanya mendengar cuplikan ~30 detik.
export default function Music() {
  const root = useRef(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.music-anim', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.15,
        scrollTrigger: { trigger: root.current, start: 'top 82%', toggleActions: 'play none none none' },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  const src = `https://open.spotify.com/embed/${music.type}/${music.id}?utm_source=generator&theme=0`

  return (
    <div className="music" ref={root}>
      <div className="music-copy music-anim">
        <h3 className="music-title">
          Sedikit musik.
          <br />
          <span className="grad">Banyak ide.</span>
        </h3>
        <p>Musik yang menemani saya mengubah ide menjadi sesuatu yang nyata. Intip playlist yang sering saya putar.</p>
        <a className="btn btn-outline" href={music.url} target="_blank" rel="noopener noreferrer">
          <FiMusic /> Buka di Spotify <FiArrowUpRight />
        </a>
      </div>

      <div className="music-player music-anim">
        {!loaded && <div className="music-loading">Memuat pemutar...</div>}
        <iframe
          title="Pemutar Spotify"
          src={src}
          width="100%"
          height="352"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  )
}
