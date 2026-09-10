import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyAppearance } from './data/appearance'

applyAppearance()
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyAppearance)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
