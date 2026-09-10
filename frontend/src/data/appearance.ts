export function applyAppearance() {
  let theme = 'system'
  try { theme = localStorage.getItem('appearance') || 'system' } catch { /* Use system when storage is unavailable. */ }
  document.documentElement.dataset.theme = theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme === 'dark' ? 'dark' : 'light'
}
