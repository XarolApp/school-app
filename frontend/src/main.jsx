import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted (bundled) fonts: the privacy policy promises no request to a
// third-party font CDN, so never switch these back to fonts.googleapis.com.
import '@fontsource/archivo/400.css'
import '@fontsource/archivo/500.css'
import '@fontsource/archivo/600.css'
import '@fontsource/archivo/700.css'
import '@fontsource/archivo-narrow/400.css'
import '@fontsource/archivo-narrow/500.css'
import '@fontsource/archivo-narrow/600.css'
import '@fontsource/archivo-narrow/700.css'
import './design/tokens.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
