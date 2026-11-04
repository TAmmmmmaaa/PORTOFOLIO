// Penanda kecil yang dibagi antara kartu 3D (Lanyard) dan layar loading.
// Lanyard melapor "tekstur kartu sudah termuat" dan "scene sudah merender beberapa frame",
// Loader membacanya untuk menghitung persen.
const cards = new Set()
let scene = false
const subs = new Set()
const emit = () => subs.forEach((fn) => fn())

export const markCard = (kind) => {
  cards.add(kind)
  emit()
}
export const markScene = () => {
  scene = true
  emit()
}
export const cardsReady = () => cards.size >= 2
export const getLoadState = () => ({ cards: Math.min(cards.size, 2), scene })
export const subscribeLoad = (fn) => {
  subs.add(fn)
  return () => subs.delete(fn)
}
