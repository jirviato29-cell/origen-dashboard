import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { puedeRegistrar } from '../permissions';
import { useRegistrarModal } from '../context/RegistrarModalContext';
import { useOfrendasModal } from '../context/OfrendasModalContext';
import { useGastosModal } from '../context/GastosModalContext';
import { useAsistenciaStewModal } from '../context/AsistenciaStewModalContext';
import { useCalendarioModal } from '../context/CalendarioModalContext';
import Sidebar from './Sidebar';
import GlobalAsistenciaModal from './GlobalAsistenciaModal';
import GlobalAsistenciaStewModal from './GlobalAsistenciaStewModal';
import GlobalOfrendasModal from './GlobalOfrendasModal';
import GlobalGastosModal from './GlobalGastosModal';
import GlobalCalendarioModal from './GlobalCalendarioModal';
import { I } from './Icons';

const ROUTE_INFO = {
  '/administracion':                    { section: 'Administración',    title: 'Dashboard' },
  '/administracion/ingresos':           { section: 'Administración',    title: 'Ingresos' },
  '/administracion/gastos':             { section: 'Administración',    title: 'Gastos' },
  '/administracion/mensual':            { section: 'Administración',    title: 'Vista mensual' },
  '/pastor':                            { section: 'Pastor',            title: 'Resumen general' },
  '/pastor/finanzas':                   { section: 'Pastor',            title: 'Finanzas' },
  '/pastor/asistencia':                 { section: 'Pastor',            title: 'Asistencia' },
  '/anfitriones/asistencia':            { section: 'Anfitriones',       title: 'Asistencia' },
  '/anfitriones/calendario':            { section: 'Anfitriones',       title: 'Calendario' },
  '/punto_encuentro':                   { section: 'Punto de Encuentro', title: 'Registro' },
  '/punto_encuentro/asistencia':        { section: 'Punto de Encuentro', title: 'Asistencia' },
  '/punto_encuentro/calendario':        { section: 'Punto de Encuentro', title: 'Calendario' },
  '/stewardship':                       { section: 'Stewardship',        title: 'Dashboard' },
  '/stewardship/finanzas':              { section: 'Stewardship',        title: 'Finanzas' },
  '/stewardship/ingresos':              { section: 'Stewardship',        title: 'Ingresos' },
  '/stewardship/gastos':                { section: 'Stewardship',        title: 'Gastos pagados' },
  '/stewardship/gastos-por-pagar':      { section: 'Stewardship',        title: 'Gastos por pagar' },
  '/stewardship/balance':               { section: 'Stewardship',        title: 'Balance' },
  '/stewardship/participacion':         { section: 'Stewardship',        title: 'Participación' },
  '/stewardship/asistencia':            { section: 'Stewardship',        title: 'Asistencia' },
  '/stewardship/punto-encuentro':       { section: 'Stewardship',        title: 'Punto de Encuentro' },
  '/stewardship/calendario':            { section: 'Stewardship',        title: 'Calendario' },
  '/stewardship/configuracion':         { section: 'Stewardship',        title: 'Configuración' },
};

export default function Layout() {
  const { role, userName, permisos } = useAuth();
  const { openModal }                    = useRegistrarModal();
  const { openModal: openOfrendasModal } = useOfrendasModal();
  const { openModal: openGastosModal }   = useGastosModal();
  const { openModal: openAsistenciaModal } = useAsistenciaStewModal();
  const { openModal: openCalendarioModal } = useCalendarioModal();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (!role) return <Navigate to="/" replace />;

  const path = location.pathname;
  const info = ROUTE_INFO[path] || { section: '', title: '' };

  const isStewardship    = role === ROLES.STEWARDSHIP;
  const isGastosPorPagar = path.endsWith('/gastos-por-pagar');
  const isGastos         = path.endsWith('/gastos');
  const isAsistencia     = path.endsWith('/asistencia');
  const isCalendario     = path.endsWith('/calendario');

  // Botones de topbar — cada uno requiere permiso de registrar en su sección
  // puedeRegistrar devuelve true si total:true (stewardship/admin/pastor)
  // o si la sección tiene registrar:true en el mapa de permisos del rol.
  const canRegAsistencia  = puedeRegistrar(permisos, 'asistencia');
  const canRegCalendario  = puedeRegistrar(permisos, 'calendario');
  const canRegPE          = puedeRegistrar(permisos, 'punto_encuentro');

  // Stewardship: "Registrar Ofrenda" aparece en ingresos/dashboard, no en secciones que tienen su propio botón
  const showOfrendaBtn = isStewardship && !isGastos && !isGastosPorPagar && !isAsistencia && !isCalendario
    && path !== '/stewardship/balance'
    && path !== '/stewardship/punto-encuentro'
    && path !== '/stewardship/configuracion';

  return (
    <div className="app" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'rgba(28,24,21,0.55)' }}
          className="lg:hidden"
        />
      )}

      {/* ── Sidebar ── */}
      <div className={`
        fixed inset-y-0 left-0 z-30 flex-shrink-0 w-60
        transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header className="topbar" style={{ flexShrink: 0 }}>

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
                {info.section && <><span className="sep">/</span><span>{info.section}</span></>}
                {info.title   && <><span className="sep">/</span><span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{info.title}</span></>}
              </div>
              <h1 className="page-title"
                style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {info.title || 'Origen Campus Ags'}
              </h1>
            </div>
          </div>

          <div className="topbar-right">

            {/* Stewardship — Registrar Ofrenda (en páginas de ingresos/dashboard) */}
            {showOfrendaBtn && (
              <button className="btn btn-primary" onClick={openOfrendasModal}>
                <I.plus size={15} /><span className="topbar-btn-label"> Registrar Ofrenda</span>
              </button>
            )}

            {/* Stewardship — Registrar gasto por pagar */}
            {isStewardship && isGastosPorPagar && (
              <button className="btn btn-primary" onClick={() => openGastosModal(false)}>
                <I.plus size={15} /><span className="topbar-btn-label"> Registrar gasto por pagar</span>
              </button>
            )}

            {/* Asistencia — solo si tiene permiso de registrar en asistencia (stewardship: true) */}
            {isAsistencia && canRegAsistencia && (
              <button className="btn btn-primary" onClick={openAsistenciaModal}>
                <I.plus size={15} /><span className="topbar-btn-label"> Registrar Asistencia</span>
              </button>
            )}

            {/* Calendario — solo si tiene permiso de registrar en calendario */}
            {isCalendario && canRegCalendario && (
              <button className="btn btn-primary" onClick={openCalendarioModal}>
                <I.plus size={15} /><span className="topbar-btn-label"> Registrar Evento</span>
              </button>
            )}

            {/* Punto de Encuentro — solo si tiene permiso de registrar en punto_encuentro */}
            {path.endsWith('/punto_encuentro') && canRegPE && (
              <button className="btn btn-primary" onClick={() => {}}>
                <I.plus size={15} /><span className="topbar-btn-label"> Registrar</span>
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
      <GlobalAsistenciaStewModal />
      <GlobalOfrendasModal />
      <GlobalGastosModal />
      <GlobalCalendarioModal />
    </div>
  );
}
