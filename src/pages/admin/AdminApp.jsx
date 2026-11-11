import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import { ToastProvider } from '../../components/admin/ui'
import FullScreenLoader from '../../components/ui/FullScreenLoader'
import AdminLayout from './AdminLayout'
import Login from './Login'
import Dashboard from './Dashboard'
import Citas from './Citas'
import Clientes from './Clientes'
import ClienteDetalle from './ClienteDetalle'
import Servicios from './Servicios'
import Finanzas from './Finanzas'
import Configuracion from './Configuracion'
import { isSupabaseConfigured } from '../../lib/supabase'

function Guard({ children }) {
  const { loading, session, isStaff } = useAuth()
  if (loading) return <FullScreenLoader label="Comprobando acceso" />
  if (!session) return <Navigate to="/admin/login" replace />
  if (!isStaff) return <Navigate to="/admin/login?denied=1" replace />
  return children
}

export default function AdminApp() {
  if (!isSupabaseConfigured) return <NotConfigured />
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen bg-obsidian text-ivory">
          <Routes>
            <Route path="login" element={<Login />} />
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
    </AuthProvider>
  )
}

function NotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian p-6 text-ivory">
      <div className="max-w-lg rounded-[2rem] border border-champagne/25 bg-slate p-8">
        <p className="label-mono mb-3">Panel privado</p>
        <h1 className="text-2xl font-semibold">Falta conectar Supabase</h1>
        <p className="mt-3 text-sm text-steel">Crea un archivo <code className="font-mono text-champagne">.env</code> con <code className="font-mono text-champagne">VITE_SUPABASE_URL</code> y <code className="font-mono text-champagne">VITE_SUPABASE_ANON_KEY</code> (ver README) y reinicia la aplicación.</p>
      </div>
    </div>
  )
}
