import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FiCode, FiCpu, FiExternalLink, FiGithub, FiImage, FiTool } from 'react-icons/fi'
import {
  SiCss,
  SiGit,
  SiGithub,
  SiGreensock,
  SiHtml5,
  SiJavascript,
  SiReact,
  SiSupabase,
  SiThreedotjs,
  SiVercel,
  SiVite,
} from 'react-icons/si'
import { projects, techStack } from '../config'

gsap.registerPlugin(ScrollTrigger)

// Kunci `icon` di config -> ikon dan warna merek.
const ICONS = {
  react: { Icon: SiReact, color: '#61dafb' },
  javascript: { Icon: SiJavascript, color: '#f7df1e' },
  html5: { Icon: SiHtml5, color: '#e34f26' },
  css3: { Icon: SiCss, color: '#1572b6' },
  threejs: { Icon: SiThreedotjs, color: 'var(--icon-white)' },
  gsap: { Icon: SiGreensock, color: '#88ce02' },
  supabase: { Icon: SiSupabase, color: '#3ecf8e' },
  vite: { Icon: SiVite, color: '#a78bfa' },
  git: { Icon: SiGit, color: '#f05032' },
  github: { Icon: SiGithub, color: 'var(--icon-white)' },
  vercel: { Icon: SiVercel, color: 'var(--icon-white)' },
}

const TABS = [
  { id: 'projects', label: 'Projects', Icon: FiCode },
  { id: 'tech', label: 'Tech Stack', Icon: FiCpu },
]

// Gambar proyek. Kalau file belum ada, tampil kotak sementara.
function Cover({ src, title }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div className="pf-cover pf-cover-empty" aria-hidden="true">
        <FiImage />
        <span>Screenshot belum ada</span>
      </div>
    )
  }
  return (
    <div className="pf-cover">
      <img src={src} alt={`Tampilan proyek ${title}`} loading="lazy" onError={() => setFailed(true)} draggable={false} />
    </div>
  )
}

function ProjectCard({ project }) {
  return (
    <article className="pf-item pf-card">
      <Cover src={project.image} title={project.title} />
      <div className="pf-card-body">
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <ul className="pf-tags">
          {project.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        {(project.demo || project.github) && (
          <div className="pf-links">
            {project.demo && (
              <a className="btn btn-primary pf-btn" href={project.demo} target="_blank" rel="noopener noreferrer">
                <FiExternalLink /> Live Demo
              </a>
            )}
            {project.github && (
              <a className="btn btn-ghost pf-btn" href={project.github} target="_blank" rel="noopener noreferrer">
                <FiGithub /> GitHub
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

// Tampil kalau `projects` di config masih kosong.
function EmptyProjects() {
  return (
    <article className="pf-item pf-wip">
      <span className="pf-wip-icon" aria-hidden="true">
        <FiTool />
      </span>
      <h3>Proyek sedang dalam tahap pengerjaan</h3>
      <p>Belum ada yang bisa dipamerkan. Proyek pertama sedang dibangun, jadi mampir lagi nanti.</p>
    </article>
  )
}

function TechCard({ tech }) {
  const entry = ICONS[tech.icon]
  const Icon = entry?.Icon
  return (
    <div className="pf-item pf-tech" style={{ '--brand': entry?.color || 'var(--accent-2)' }}>
      {Icon && <Icon className="pf-tech-icon" aria-hidden="true" />}
      <span>{tech.name}</span>
    </div>
  )
}

export default function Portfolio() {
  const root = useRef(null)
  const [tab, setTab] = useState('projects')

  // Judul muncul saat di-scroll.
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.pf-head > *', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '.pf-head', start: 'top 85%', toggleActions: 'play none none none' },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  // Isi panel masuk dengan animasi. Pertama kali menunggu di-scroll, selanjutnya langsung saat tab berganti.
  const firstRun = useRef(true)
  useEffect(() => {
    const ctx = gsap.context(() => {
      const opts = {
        y: 36,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.06,
        clearProps: 'transform,opacity', // lepas transform agar efek hover CSS tetap jalan
      }
      if (firstRun.current) {
        firstRun.current = false
        gsap.from('.pf-item', {
          ...opts,
          scrollTrigger: { trigger: '.pf-panel', start: 'top 88%', toggleActions: 'play none none none' },
        })
      } else {
        gsap.from('.pf-item', opts)
      }
    }, root)
    return () => ctx.revert()
  }, [tab])

  // Panah kiri/kanan berpindah tab.
  const onKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = TABS.findIndex((t) => t.id === tab)
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    setTab(next.id)
    document.getElementById(`pf-tab-${next.id}`)?.focus()
  }

  return (
    <section id="portfolio" className="portfolio" ref={root}>
      <div className="pf-head">
        <h2 className="section-title">Portfolio</h2>
        <p className="section-sub">Proyek yang pernah saya buat dan teknologi yang saya pakai.</p>
      </div>

      <div className="pf-tabs" role="tablist" aria-label="Isi portofolio" onKeyDown={onKey}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            id={`pf-tab-${id}`}
            role="tab"
            type="button"
            aria-selected={tab === id}
            aria-controls="pf-panel"
            tabIndex={tab === id ? 0 : -1}
            className="pf-tab"
            onClick={() => setTab(id)}
          >
            <Icon /> {label}
          </button>
        ))}
      </div>

      <div id="pf-panel" role="tabpanel" aria-labelledby={`pf-tab-${tab}`} className="pf-panel" key={tab}>
        {tab === 'projects' ? (
          <div className="pf-grid">
            {projects.length === 0 ? (
              <EmptyProjects />
            ) : (
              projects.map((p) => <ProjectCard key={p.title} project={p} />)
            )}
          </div>
        ) : (
          <div className="pf-tech-grid">
            {techStack.map((t) => (
              <TechCard key={t.name} tech={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
