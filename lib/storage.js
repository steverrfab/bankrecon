const STORE_KEY = 'bankrecon_v1'

export function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data))
  } catch {}
}
