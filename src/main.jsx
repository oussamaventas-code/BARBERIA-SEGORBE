import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { BusinessProvider } from './context/BusinessContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BusinessProvider>
        <App />
      </BusinessProvider>
    </BrowserRouter>
  </StrictMode>,
)
