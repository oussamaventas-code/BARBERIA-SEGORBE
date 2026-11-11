import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { BusinessProvider } from './context/BusinessContext'
import { AuthProvider } from './context/AuthContext'
import { IdentityProvider } from './context/IdentityContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BusinessProvider>
        <AuthProvider>
          <IdentityProvider>
            <App />
          </IdentityProvider>
        </AuthProvider>
      </BusinessProvider>
    </BrowserRouter>
  </StrictMode>,
)
