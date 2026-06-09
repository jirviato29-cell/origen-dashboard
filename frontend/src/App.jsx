import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RegistrarModalProvider } from './context/RegistrarModalContext';
import { OfrendasModalProvider } from './context/OfrendasModalContext';
import { GastosModalProvider } from './context/GastosModalContext';
import { AsistenciaStewModalProvider } from './context/AsistenciaStewModalContext';
import { CalendarioModalProvider } from './context/CalendarioModalContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/AdminDashboard';
import IngresosPage from './pages/admin/IngresosPage';
import GastosPage from './pages/admin/GastosPage';
import VistaMensual from './pages/admin/VistaMensual';
import RegistrarAsistencia from './pages/anfitriones/RegistrarAsistencia';
import EstadisticasAsistencia from './pages/anfitriones/EstadisticasAsistencia';
import HistorialAsistencia from './pages/anfitriones/HistorialAsistencia';
import StewardshipDashboard from './pages/stewardship/StewardshipDashboard';
import AsistenciaViewPage from './pages/stewardship/AsistenciaViewPage';
import PuntoEncuentroViewPage from './pages/stewardship/PuntoEncuentroViewPage';
import ConfiguracionPage from './pages/stewardship/ConfiguracionPage';
import StewardshipIngresosPage from './pages/stewardship/IngresosPage';
import StewardshipGastosPage from './pages/stewardship/GastosPage';
import StewardshipGastosPorPagarPage from './pages/stewardship/GastosPorPagarPage';
import StewardshipBalancePage from './pages/stewardship/BalancePage';
import CalendarioPage from './pages/stewardship/CalendarioPage';
import VoluntariosPage from './pages/stewardship/VoluntariosPage';
import './index.css';

// Protege una sección de rutas: redirige a / si no hay sesión,
// o al inicio del rol propio si intenta entrar a rutas de otro rol.
function ProtectedRoute({ routeRole, children }) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/" replace />;
  if (role !== routeRole) return <Navigate to={`/${role}`} replace />;
  return children;
}

function AppRoutes() {
  const { role } = useAuth();

  return (
    <Routes>
      <Route path="/" element={role ? <Navigate to={`/${role}`} replace /> : <LoginPage />} />

      {/* ── Administración ─────────────────────────────────────────────── */}
      <Route path="/administracion" element={
        <ProtectedRoute routeRole="administracion"><Layout /></ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="ingresos" element={<IngresosPage />} />
        <Route path="gastos"   element={<GastosPage />} />
        <Route path="mensual"  element={<VistaMensual />} />
      </Route>

      {/* ── Pastor ─────────────────────────────────────────────────────── */}
      <Route path="/pastor" element={
        <ProtectedRoute routeRole="pastor"><Layout /></ProtectedRoute>
      }>
        <Route index                   element={<StewardshipDashboard />} />
        <Route path="ingresos"         element={<StewardshipIngresosPage />} />
        <Route path="gastos"           element={<StewardshipGastosPage />} />
        <Route path="balance"          element={<StewardshipBalancePage />} />
        <Route path="asistencia"       element={<AsistenciaViewPage />} />
        <Route path="punto-encuentro"  element={<PuntoEncuentroViewPage />} />
        <Route path="calendario"       element={<CalendarioPage />} />
      </Route>

      {/* ── Anfitriones ────────────────────────────────────────────────── */}
      <Route path="/anfitriones" element={
        <ProtectedRoute routeRole="anfitriones"><Layout /></ProtectedRoute>
      }>
        <Route index               element={<Navigate to="/anfitriones/asistencia" replace />} />
        <Route path="estadisticas" element={<Navigate to="/anfitriones/asistencia" replace />} />
        <Route path="historial"    element={<Navigate to="/anfitriones/asistencia" replace />} />
        <Route path="asistencia"   element={<AsistenciaViewPage />} />
        <Route path="calendario"   element={<CalendarioPage />} />
      </Route>

      {/* ── Punto de Encuentro ─────────────────────────────────────────── */}
      <Route path="/punto_encuentro" element={
        <ProtectedRoute routeRole="punto_encuentro"><Layout /></ProtectedRoute>
      }>
        <Route index             element={<PuntoEncuentroViewPage />} />
        <Route path="asistencia" element={<AsistenciaViewPage />} />
        <Route path="calendario" element={<CalendarioPage />} />
      </Route>

      {/* ── Stewardship ────────────────────────────────────────────────── */}
      <Route path="/stewardship" element={
        <ProtectedRoute routeRole="stewardship"><Layout /></ProtectedRoute>
      }>
        <Route index                   element={<StewardshipDashboard />} />
        <Route path="ingresos"         element={<StewardshipIngresosPage />} />
        <Route path="gastos"           element={<StewardshipGastosPage />} />
        <Route path="gastos-por-pagar" element={<StewardshipGastosPorPagarPage />} />
        <Route path="balance"          element={<StewardshipBalancePage />} />
        <Route path="asistencia"       element={<AsistenciaViewPage />} />
        <Route path="punto-encuentro"  element={<PuntoEncuentroViewPage />} />
        <Route path="voluntarios"      element={<VoluntariosPage />} />
        <Route path="calendario"       element={<CalendarioPage />} />
        <Route path="configuracion"    element={<ConfiguracionPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <RegistrarModalProvider>
      <OfrendasModalProvider>
        <GastosModalProvider>
          <AsistenciaStewModalProvider>
            <CalendarioModalProvider>
              <AuthProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </AuthProvider>
            </CalendarioModalProvider>
          </AsistenciaStewModalProvider>
        </GastosModalProvider>
      </OfrendasModalProvider>
    </RegistrarModalProvider>
  );
}
