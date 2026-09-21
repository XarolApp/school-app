import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/lora/400.css'
import '@fontsource/lora/500.css'
import '@fontsource/lora/600.css'
import '@fontsource/lora/700.css'
import '@fontsource/lora/400-italic.css'
import '@fontsource/public-sans/400.css'
import '@fontsource/public-sans/600.css'
import './design/tokens.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
