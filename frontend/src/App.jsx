import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RegistrarModalProvider } from './context/RegistrarModalContext';
import { OfrendasModalProvider } from './context/OfrendasModalContext';
import { GastosModalProvider } from './context/GastosModalContext';
import { AsistenciaStewModalProvider } from './context/AsistenciaStewModalContext';
import { CalendarioModalProvider } from './context/CalendarioModalContext';
import { TiposEventoProvider } from './context/TiposEventoContext';
import { MinisteriosProvider } from './context/MinisteriosContext';
import CampusPage from './pages/CampusPage';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import AdminDashboard from './pages/admin/AdminDashboard';
import IngresosPage from './pages/admin/IngresosPage';
import GastosPage from './pages/admin/GastosPage';
import VistaMensual from './pages/admin/VistaMensual';
import RegistrarAsistencia from './pages/anfitriones/RegistrarAsistencia';
import EstadisticasAsistencia from './pages/anfitriones/EstadisticasAsistencia';
import HistorialAsistencia from './pages/anfitriones/HistorialAsistencia';
import StewardshipDashboard from './pages/stewardship/StewardshipDashboard';
import OfrendasEspecialesPage from './pages/stewardship/OfrendasEspecialesPage';
import OfrendasEspecialesDetallePage from './pages/stewardship/OfrendasEspecialesDetallePage';
import AsistenciaViewPage from './pages/stewardship/AsistenciaViewPage';
import PuntoEncuentroViewPage from './pages/stewardship/PuntoEncuentroViewPage';
import GastosEventosPage from './pages/stewardship/GastosEventosPage';
import ConfiguracionPage from './pages/stewardship/ConfiguracionPage';
import StewardshipIngresosPage from './pages/stewardship/IngresosPage';
import StewardshipGastosPage from './pages/stewardship/GastosPage';
import StewardshipGastosPorPagarPage from './pages/stewardship/GastosPorPagarPage';
import StewardshipBalancePage from './pages/stewardship/BalancePage';
import CalendarioPage from './pages/stewardship/CalendarioPage';
import VoluntariosPage from './pages/stewardship/VoluntariosPage';
import EquiposPage from './pages/stewardship/EquiposPage';
import BienvenidaCasaPage from './pages/anfitriones/BienvenidaCasaPage';
import { LiderVoluntarios, LiderPosiciones, LiderProgramar, LiderTablero } from './pages/lider/PanelLider';
import PanelVoluntario from './pages/voluntario/PanelVoluntario';
import MisPuestos from './pages/voluntario/MisPuestos';
import LoginVoluntario from './pages/voluntario/LoginVoluntario';
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
      <Route path="/"      element={role ? <Navigate to={`/${role}`} replace /> : <CampusPage />} />
      <Route path="/login" element={role ? <Navigate to={`/${role}`} replace /> : <LoginPage />} />

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
        <Route path="asistencia"              element={<AsistenciaViewPage />} />
        <Route path="punto-encuentro"         element={<PuntoEncuentroViewPage />} />
        <Route path="bienvenida-a-casa"       element={<BienvenidaCasaPage />} />
        <Route path="calendario"              element={<CalendarioPage />} />
        <Route path="ofrendas-especiales"     element={<OfrendasEspecialesPage />} />
        <Route path="ofrendas-especiales/:id" element={<OfrendasEspecialesDetallePage />} />
      </Route>

      {/* ── Anfitriones ────────────────────────────────────────────────── */}
      <Route path="/anfitriones" element={
        <ProtectedRoute routeRole="anfitriones"><Layout /></ProtectedRoute>
      }>
        <Route index               element={<Navigate to="/anfitriones/asistencia" replace />} />
        <Route path="estadisticas" element={<Navigate to="/anfitriones/asistencia" replace />} />
        <Route path="historial"    element={<Navigate to="/anfitriones/asistencia" replace />} />
        <Route path="asistencia"        element={<AsistenciaViewPage />} />
        <Route path="voluntarios"       element={<VoluntariosPage />} />
        <Route path="calendario"        element={<CalendarioPage />} />
        <Route path="bienvenida-a-casa" element={<Navigate to="/anfitriones/asistencia" replace />} />
      </Route>

      {/* ── Punto de Encuentro ─────────────────────────────────────────── */}
      <Route path="/punto_encuentro" element={
        <ProtectedRoute routeRole="punto_encuentro"><Layout /></ProtectedRoute>
      }>
        <Route index                     element={<PuntoEncuentroViewPage />} />
        <Route path="gastos-eventos"     element={<GastosEventosPage />} />
        <Route path="bienvenida-a-casa"  element={<BienvenidaCasaPage />} />
        <Route path="asistencia"         element={<AsistenciaViewPage />} />
        <Route path="calendario"         element={<CalendarioPage />} />
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
        <Route path="asistencia"         element={<AsistenciaViewPage />} />
        <Route path="punto-encuentro"    element={<PuntoEncuentroViewPage />} />
        <Route path="gastos-eventos"     element={<GastosEventosPage />} />
        <Route path="bienvenida-a-casa"  element={<BienvenidaCasaPage />} />
        <Route path="voluntarios"        element={<VoluntariosPage />} />
        <Route path="calendario"         element={<CalendarioPage />} />
        <Route path="equipos"            element={<EquiposPage />} />
        <Route path="configuracion"      element={<ConfiguracionPage />} />
        <Route path="ofrendas-especiales"          element={<OfrendasEspecialesPage />} />
        <Route path="ofrendas-especiales/:id"      element={<OfrendasEspecialesDetallePage />} />
      </Route>

      {/* ── Líder de ministerio ────────────────────────────────────────── */}
      <Route path="/lider_ministerio" element={
        <ProtectedRoute routeRole="lider_ministerio"><Layout /></ProtectedRoute>
      }>
        <Route index element={<Navigate to="/lider_ministerio/voluntarios" replace />} />
        <Route path="voluntarios" element={<LiderVoluntarios />} />
        <Route path="posiciones"  element={<LiderPosiciones />} />
        <Route path="programar"   element={<LiderProgramar />} />
        <Route path="tablero"     element={<LiderTablero />} />
      </Route>

      {/* ── Voluntario ─────────────────────────────────────────────────── */}
      {/* /voluntario/login queda sin Layout (pantalla de acceso propia). */}
      <Route path="/voluntario/login" element={
        role ? <Navigate to={`/${role}`} replace /> : <LoginVoluntario />
      } />
      <Route path="/voluntario" element={
        <ProtectedRoute routeRole="voluntario"><Layout /></ProtectedRoute>
      }>
        <Route index element={<Navigate to="/voluntario/calendario" replace />} />
        <Route path="calendario" element={<PanelVoluntario />} />
        <Route path="puestos"    element={<MisPuestos />} />
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
              <TiposEventoProvider>
              <AuthProvider>
              <MinisteriosProvider>
                <BrowserRouter>
                  <ErrorBoundary>
                    <AppRoutes />
                  </ErrorBoundary>
                </BrowserRouter>
              </MinisteriosProvider>
              </AuthProvider>
              </TiposEventoProvider>
            </CalendarioModalProvider>
          </AsistenciaStewModalProvider>
        </GastosModalProvider>
      </OfrendasModalProvider>
    </RegistrarModalProvider>
  );
}
