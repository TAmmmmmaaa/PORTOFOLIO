import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Background from './components/Background'
import Navbar from './components/Navbar'
import Loader from './components/Loader'
import Hero from './components/Hero'
import About from './components/About'
import Portfolio from './components/Portfolio'
import Contact from './components/Contact'
import Footer from './components/Footer'
import { sections } from './config'
import { useTheme } from './lib/theme'
import { installClickSound } from './lib/sound'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  // Hero baru memulai animasinya setelah layar loading selesai.
  const [ready, setReady] = useState(false)
  const [theme, toggleTheme] = useTheme()

  useEffect(() => installClickSound(), [])

  // Scroll dikunci selama loading, jadi hitung ulang posisi animasi scroll setelahnya.
  useEffect(() => {
    if (ready) ScrollTrigger.refresh()
  }, [ready])

  return (
    <>
      <Loader onReady={() => setReady(true)} />
      <Background theme={theme} />
      <Navbar sections={sections} theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <Hero ready={ready} />
        <About />
        <Portfolio />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
