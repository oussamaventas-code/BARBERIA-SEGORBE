import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ToastProvider } from '../../components/admin/ui'
import FullScreenLoader from '../../components/ui/FullScreenLoader'
import AdminLayout from './AdminLayout'
import Login from './Login'
import Setup from './Setup'
import Dashboard from './Dashboard'
import Citas from './Citas'
import Clientes from './Clientes'
import ClienteDetalle from './ClienteDetalle'
import Servicios from './Servicios'
import Finanzas from './Finanzas'
import Configuracion from './Configuracion'

function Guard({ children }) {
  const { loading, session, isStaff } = useAuth()
  if (loading) return <FullScreenLoader label="Comprobando acceso" />
  if (!session) return <Navigate to="/admin/login" replace />
  if (!isStaff) return <Navigate to="/admin/login?denied=1" replace />
  return children
}

export default function AdminApp() {
  return (
    <>
      <ToastProvider>
        <div className="min-h-screen bg-obsidian text-ivory">
          <Routes>
            <Route path="login" element={<Login />} />
            <Route path="setup" element={<Setup />} />
            <Route element={<Guard><AdminLayout /></Guard>}>
              <Route index element={<Dashboard />} />
              <Route path="citas" element={<Citas />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="clientes/:id" element={<ClienteDetalle />} />
              <Route path="servicios" element={<Servicios />} />
              <Route path="finanzas" element={<Finanzas />} />
              <Route path="configuracion" element={<Configuracion />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Routes>
        </div>
      </ToastProvider>
    </>
  )
}
