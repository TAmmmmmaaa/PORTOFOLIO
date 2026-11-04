import { FiArrowUp, FiTerminal } from 'react-icons/fi'
import { FaGithub, FaInstagram, FaTiktok } from 'react-icons/fa6'
import { footer, profile } from '../config'
import { scrollToSection } from '../lib/scroll'

const SOCIALS = [
  { key: 'github', label: 'GitHub', Icon: FaGithub },
  { key: 'instagram', label: 'Instagram', Icon: FaInstagram },
  { key: 'tiktok', label: 'TikTok', Icon: FaTiktok },
]

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <p className="footer-logo">
            <FiTerminal aria-hidden="true" /> {footer.brand}
          </p>
          {footer.texts.map((t) => (
            <p key={t} className="footer-text">
              {t}
            </p>
          ))}
        </div>

        <nav className="footer-col" aria-label="Navigasi footer">
          <h4 className="footer-h">Navigasi</h4>
          <ul>
            {footer.links.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => scrollToSection(l.id)}>
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-col">
          <h4 className="footer-h">Terhubung</h4>
          <div className="footer-socials">
            {SOCIALS.map(({ key, label, Icon }) => (
              <a key={key} className="footer-social" href={profile.socials[key]} target="_blank" rel="noopener noreferrer" aria-label={label}>
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} {footer.brand.replace('>_ ', '')}. All rights reserved.
        </p>
        <button type="button" className="footer-top-btn" onClick={() => scrollToSection('home')}>
          Kembali ke Atas <FiArrowUp />
        </button>
      </div>
    </footer>
  )
}
