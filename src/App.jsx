import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import PublicLayout from './components/public/PublicLayout'
import Home from './pages/public/Home'
import ServicesPage from './pages/public/ServicesPage'
import BookingPage from './pages/public/BookingPage'
import ContactPage from './pages/public/ContactPage'
import { PrivacyPage, LegalNoticePage, CookiesPage } from './pages/public/LegalPages'
import LaBarberia from './pages/public/LaBarberia'
import Cuenta from './pages/public/Cuenta'
import MyBookings from './pages/public/MyBookings'
import NotFound from './pages/public/NotFound'
import ScrollManager from './components/ui/ScrollManager'
import FullScreenLoader from './components/ui/FullScreenLoader'

// El panel privado se carga aparte: no pesa en la web pública
const AdminApp = lazy(() => import('./pages/admin/AdminApp'))

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="servicios" element={<ServicesPage />} />
          <Route path="reservar" element={<BookingPage />} />
          <Route path="la-barberia" element={<LaBarberia />} />
          <Route path="cuenta" element={<Cuenta />} />
          <Route path="mis-citas" element={<MyBookings />} />
          <Route path="mis-citas/:token" element={<MyBookings />} />
          <Route path="contacto" element={<ContactPage />} />
          <Route path="privacidad" element={<PrivacyPage />} />
          <Route path="aviso-legal" element={<LegalNoticePage />} />
          <Route path="cookies" element={<CookiesPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route
          path="admin/*"
          element={
            <Suspense fallback={<FullScreenLoader />}>
              <AdminApp />
            </Suspense>
          }
        />
      </Routes>
    </>
  )
}
