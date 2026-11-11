import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import Noise from '../ui/Noise'
import SetupNotice from './SetupNotice'

export default function PublicLayout() {
  const { pathname } = useLocation()
  return (
    <div className="relative min-h-screen bg-obsidian">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-champagne focus:px-4 focus:py-2 focus:text-obsidian">
        Saltar al contenido
      </a>
      <Navbar />
      <main id="main">
        <Outlet />
      </main>
      {pathname !== '/' && <Footer />}
      <SetupNotice />
      <Noise />
    </div>
  )
}
