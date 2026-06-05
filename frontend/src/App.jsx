import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RegistrarModalProvider } from './context/RegistrarModalContext';
import { OfrendasModalProvider } from './context/OfrendasModalContext';
import { GastosModalProvider } from './context/GastosModalContext';
import { AsistenciaStewModalProvider } from './context/AsistenciaStewModalContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/AdminDashboard';
import IngresosPage from './pages/admin/IngresosPage';
import GastosPage from './pages/admin/GastosPage';
import VistaMensual from './pages/admin/VistaMensual';
import ComingSoon from './pages/ComingSoon';
import RegistrarAsistencia from './pages/anfitriones/RegistrarAsistencia';
import EstadisticasAsistencia from './pages/anfitriones/EstadisticasAsistencia';
import HistorialAsistencia from './pages/anfitriones/HistorialAsistencia';
import StewardshipDashboard from './pages/stewardship/StewardshipDashboard';
import FinanzasPage from './pages/stewardship/FinanzasPage';
import AsistenciaViewPage from './pages/stewardship/AsistenciaViewPage';
import PuntoEncuentroViewPage from './pages/stewardship/PuntoEncuentroViewPage';
import ConfiguracionPage from './pages/stewardship/ConfiguracionPage';
import StewardshipIngresosPage from './pages/stewardship/IngresosPage';
import StewardshipGastosPage from './pages/stewardship/GastosPage';
import StewardshipBalancePage from './pages/stewardship/BalancePage';
import './index.css';

function AppRoutes() {
  const { role } = useAuth();

  return (
    <Routes>
      <Route path="/" element={role ? <Navigate to={`/${role}`} replace /> : <LoginPage />} />

      <Route path="/administracion" element={<Layout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="ingresos" element={<IngresosPage />} />
        <Route path="gastos" element={<GastosPage />} />
        <Route path="mensual" element={<VistaMensual />} />
      </Route>

      <Route path="/pastor" element={<Layout />}>
        <Route index element={<ComingSoon role="Pastor" />} />
        <Route path="finanzas" element={<ComingSoon role="Pastor - Finanzas" />} />
        <Route path="asistencia" element={<ComingSoon role="Pastor - Asistencia" />} />
      </Route>

      <Route path="/anfitriones" element={<Layout />}>
        <Route index element={<RegistrarAsistencia />} />
        <Route path="estadisticas" element={<EstadisticasAsistencia />} />
        <Route path="historial" element={<HistorialAsistencia />} />
      </Route>

      <Route path="/punto_encuentro" element={<Layout />}>
        <Route index element={<ComingSoon role="Punto de Encuentro" />} />
      </Route>

      <Route path="/stewardship" element={<Layout />}>
        <Route index element={<StewardshipDashboard />} />
        <Route path="ingresos"      element={<StewardshipIngresosPage />} />
        <Route path="gastos"        element={<StewardshipGastosPage />} />
        <Route path="balance"       element={<StewardshipBalancePage />} />
        <Route path="participacion" element={<FinanzasPage />} />
        <Route path="asistencia"      element={<AsistenciaViewPage />} />
        <Route path="punto-encuentro" element={<PuntoEncuentroViewPage />} />
        <Route path="configuracion"   element={<ConfiguracionPage />} />
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
            <AuthProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </AuthProvider>
          </AsistenciaStewModalProvider>
        </GastosModalProvider>
      </OfrendasModalProvider>
    </RegistrarModalProvider>
  );
}
