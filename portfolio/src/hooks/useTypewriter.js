import { useEffect, useState } from 'react'

// Efek ketik dan hapus bergantian untuk daftar kata.
export default function useTypewriter(words, { typeSpeed = 95, deleteSpeed = 45, pause = 1400 } = {}) {
  const [text, setText] = useState('')

  useEffect(() => {
    let wordIndex = 0
    let charIndex = 0
    let deleting = false
    let timer

    const tick = () => {
      const word = words[wordIndex % words.length]
      charIndex += deleting ? -1 : 1
      setText(word.slice(0, charIndex))

      let delay = deleting ? deleteSpeed : typeSpeed
      if (!deleting && charIndex === word.length) {
        deleting = true
        delay = pause
      } else if (deleting && charIndex === 0) {
        deleting = false
        wordIndex += 1
        delay = 350
      }
      timer = setTimeout(tick, delay)
    }

    timer = setTimeout(tick, 600)
    return () => clearTimeout(timer)
  }, [words, typeSpeed, deleteSpeed, pause])

  return text
}
