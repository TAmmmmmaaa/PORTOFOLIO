// Scroll halus ke section. Aman dipanggil walau section belum ada.
export function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
