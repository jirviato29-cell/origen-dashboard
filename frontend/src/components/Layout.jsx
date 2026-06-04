import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { useRegistrarModal } from '../context/RegistrarModalContext';
import { useOfrendasModal } from '../context/OfrendasModalContext';
import { useGastosModal } from '../context/GastosModalContext';
import Sidebar from './Sidebar';
import GlobalAsistenciaModal from './GlobalAsistenciaModal';
import GlobalOfrendasModal from './GlobalOfrendasModal';
import GlobalGastosModal from './GlobalGastosModal';
import { I } from './Icons';

const ROUTE_INFO = {
  '/administracion':           { section: 'Administración',    title: 'Dashboard' },
  '/administracion/ingresos':  { section: 'Administración',    title: 'Ingresos' },
  '/administracion/gastos':    { section: 'Administración',    title: 'Gastos' },
  '/administracion/mensual':   { section: 'Administración',    title: 'Vista mensual' },
  '/pastor':                   { section: 'Pastor',            title: 'Resumen general' },
  '/pastor/finanzas':          { section: 'Pastor',            title: 'Finanzas' },
  '/pastor/asistencia':        { section: 'Pastor',            title: 'Asistencia' },
  '/anfitriones':              { section: 'Anfitriones',       title: 'Registrar Asistencia' },
  '/anfitriones/estadisticas': { section: 'Anfitriones',       title: 'Estadísticas de asistencia' },
  '/anfitriones/historial':    { section: 'Anfitriones',       title: 'Historial completo' },
  '/punto_encuentro':                  { section: 'Punto de Encuentro', title: 'Registro' },
  '/stewardship':                      { section: 'Stewardship',        title: 'Dashboard' },
  '/stewardship/finanzas':             { section: 'Stewardship',        title: 'Finanzas' },
  '/stewardship/ingresos':             { section: 'Stewardship',        title: 'Ingresos' },
  '/stewardship/gastos':               { section: 'Stewardship',        title: 'Gastos' },
  '/stewardship/balance':              { section: 'Stewardship',        title: 'Balance' },
  '/stewardship/participacion':        { section: 'Stewardship',        title: 'Participación' },
  '/stewardship/asistencia':           { section: 'Stewardship',        title: 'Asistencia' },
  '/stewardship/punto-encuentro':      { section: 'Stewardship',        title: 'Punto de Encuentro' },
  '/stewardship/configuracion':        { section: 'Stewardship',        title: 'Configuración' },
};

export default function Layout() {
  const { role, userName } = useAuth();
  const { openModal } = useRegistrarModal();
  const { openModal: openOfrendasModal } = useOfrendasModal();
  const { openModal: openGastosModal }   = useGastosModal();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isGastos = location.pathname.endsWith('/gastos');

  if (!role) return <Navigate to="/" replace />;

  const info = ROUTE_INFO[location.pathname] || { section: '', title: '' };
  const isAnfitriones = role === ROLES.ANFITRIONES;
  const isStewardship = role === ROLES.STEWARDSHIP;

  return (
    <div className="app" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 20,
            background: 'rgba(28,24,21,0.55)',
          }}
          className="lg:hidden"
        />
      )}

      {/* ── Sidebar wrapper: drawer on mobile, permanent on desktop ── */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 flex-shrink-0 w-60
          transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header className="topbar" style={{ flexShrink: 0 }}>

          {/* Hamburger – mobile only */}
          <button
            className="icon-btn lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            style={{ marginRight: 4 }}
          >
            <I.menu size={18} />
          </button>

          <div className="topbar-left" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <div className="crumbs">
                <span>{userName ? `Buen día, ${userName}` : 'Origen Aguascalientes'}</span>
                {info.section && (
                  <><span className="sep">/</span><span>{info.section}</span></>
                )}
                {info.title && (
                  <><span className="sep">/</span>
                  <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{info.title}</span></>
                )}
              </div>
              <h1 className="page-title"
                style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {info.title || 'Origen Campus Ags'}
              </h1>
            </div>
          </div>

          <div className="topbar-right">
            {isAnfitriones && (
              <button className="btn btn-primary" onClick={openModal}>
                <I.plus size={15} /> Registrar Asistencia
              </button>
            )}
            {isStewardship && !isGastos && (
              <button className="btn btn-primary" onClick={openOfrendasModal}>
                <I.plus size={15} /> Registrar Ofrenda
              </button>
            )}
            {isStewardship && isGastos && (
              <button className="btn btn-primary" onClick={openGastosModal}>
                <I.plus size={15} /> Registrar Gasto
              </button>
            )}
            <button className="icon-btn" aria-label="Notificaciones">
              <I.bell size={17} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="page">
          <Outlet />
        </main>
      </div>

      <GlobalAsistenciaModal />
      <GlobalOfrendasModal />
      <GlobalGastosModal />
    </div>
  );
}
