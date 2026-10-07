import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import './index.css'
import App from './App.tsx'
import { PALETTE } from './theme/palette'

// Copy the palette onto the page as CSS variables (--paper, --ink, ...),
// so index.css uses the same colours as the 3D scene without repeating the hex codes
for (const [name, hex] of Object.entries(PALETTE)) {
  document.documentElement.style.setProperty(`--${name}`, hex)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
