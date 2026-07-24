import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import useLiderPerfil from '../hooks/useLiderPerfil';
import usePuestosNuevos from '../hooks/usePuestosNuevos';
import { puedeRegistrar } from '../permissions';
import { useRegistrarModal } from '../context/RegistrarModalContext';
import { useGastosModal } from '../context/GastosModalContext';
import { useOfrendasModal } from '../context/OfrendasModalContext';
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
  '/pastor':                            { section: 'Pastor',  title: 'Dashboard' },
  '/pastor/ingresos':                   { section: 'Pastor',  title: 'Ingresos' },
  '/pastor/gastos':                     { section: 'Pastor',  title: 'Gastos pagados' },
  '/pastor/balance':                    { section: 'Pastor',  title: 'Finanzas' },
  '/pastor/asistencia':                 { section: 'Pastor',  title: 'Asistencia' },
  '/pastor/punto-encuentro':            { section: 'Pastor',  title: 'Punto de Encuentro' },
  '/pastor/bienvenida-a-casa':          { section: 'Pastor',  title: 'Bienvenida a Casa' },
  '/pastor/calendario':                 { section: 'Pastor',  title: 'Calendario' },
  '/anfitriones/asistencia':            { section: 'Anfitriones',       title: 'Asistencia' },
  '/anfitriones/calendario':            { section: 'Anfitriones',       title: 'Calendario' },
  '/anfitriones/bienvenida-a-casa':     { section: 'Anfitriones',       title: 'Bienvenida a Casa' },
  '/punto_encuentro':                        { section: 'Punto de Encuentro', title: 'Punto de Encuentro' },
  '/punto_encuentro/bienvenida-a-casa':      { section: 'Punto de Encuentro', title: 'Bienvenida a Casa' },
  '/punto_encuentro/asistencia':             { section: 'Punto de Encuentro', title: 'Asistencia' },
  '/punto_encuentro/calendario':             { section: 'Punto de Encuentro', title: 'Calendario' },
  '/stewardship':                       { section: 'Stewardship',        title: 'Dashboard' },
  '/stewardship/finanzas':              { section: 'Stewardship',        title: 'Finanzas' },
  '/stewardship/ingresos':              { section: 'Stewardship',        title: 'Ingresos' },
  '/stewardship/gastos':                { section: 'Stewardship',        title: 'Gastos pagados' },
  '/stewardship/gastos-por-pagar':      { section: 'Stewardship',        title: 'Gastos por pagar' },
  '/stewardship/balance':               { section: 'Stewardship',        title: 'Balance' },
  '/stewardship/participacion':         { section: 'Stewardship',        title: 'Participación' },
  '/stewardship/asistencia':            { section: 'Stewardship',        title: 'Asistencia' },
  '/stewardship/punto-encuentro':       { section: 'Stewardship',        title: 'Punto de Encuentro' },
  '/stewardship/bienvenida-a-casa':     { section: 'Stewardship',        title: 'Bienvenida a Casa' },
  '/stewardship/calendario':            { section: 'Stewardship',        title: 'Calendario' },
  '/stewardship/voluntarios':           { section: 'Stewardship',        title: 'Directorio de voluntarios' },
  '/stewardship/equipos':               { section: 'Stewardship',        title: 'Líderes y equipos' },
  '/stewardship/configuracion':         { section: 'Stewardship',        title: 'Configuración' },
  '/lider_ministerio':                  { section: 'Ministerio',         title: 'Panel de líder' },
  '/lider_ministerio/voluntarios':      { section: 'Ministerio',         title: 'Mis voluntarios' },
  '/lider_ministerio/posiciones':       { section: 'Ministerio',         title: 'Posiciones' },
  '/lider_ministerio/programar':        { section: 'Ministerio',         title: 'Programar servicio' },
  '/lider_ministerio/tablero':          { section: 'Ministerio',         title: 'Quién va dónde' },
  '/lider_ministerio/configuracion':    { section: 'Ministerio',         title: 'Configuración' },
  '/voluntario':                        { section: 'Voluntario',         title: 'Mi calendario' },
  '/voluntario/calendario':             { section: 'Voluntario',         title: 'Mi calendario' },
  '/voluntario/puestos':                { section: 'Voluntario',         title: 'Mis puestos' },
  '/voluntario/configuracion':          { section: 'Voluntario',         title: 'Configuración' },
};

export default function Layout() {
  const { role, userName, permisos } = useAuth();
  const { openModal }                       = useRegistrarModal();
  const { openModal: openGastosModal }      = useGastosModal();
  const { openModal: openOfrendasModal }    = useOfrendasModal();
  const { openModal: openAsistenciaModal } = useAsistenciaStewModal();
  const { openModal: openCalendarioModal } = useCalendarioModal();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  // Perfil del líder para el badge de la topbar. Solo hace la llamada cuando el
  // rol es lider_ministerio; para los demás roles queda 'idle' sin fetch.
  const liderPerfil = useLiderPerfil(role === ROLES.LIDER_MINISTERIO);
  // Puntito de la campanita: SOLO para el voluntario. Para los demás roles pasa
  // enabled=false, así el hook no dispara ninguna llamada (igual que useLiderPerfil).
  const { nuevos: puestosNuevos } = usePuestosNuevos(role === ROLES.VOLUNTARIO);

  if (!role) return <Navigate to="/" replace />;

  const path = location.pathname;
  const info = ROUTE_INFO[path] || { section: '', title: '' };

  const isStewardship    = role === ROLES.STEWARDSHIP;
  const isGastosPorPagar = path.endsWith('/gastos-por-pagar');
  const isGastos         = path.endsWith('/gastos');
  const isIngresos       = path.endsWith('/ingresos');
  const isAsistencia     = path.endsWith('/asistencia');
  const isCalendario     = path.endsWith('/calendario');

  // Botones de topbar — cada uno requiere permiso de registrar en su sección
  // puedeRegistrar devuelve true si total:true (stewardship/admin/pastor)
  // o si la sección tiene registrar:true en el mapa de permisos del rol.
  const canRegIngresos    = puedeRegistrar(permisos, 'ingresos');
  const canRegAsistencia  = puedeRegistrar(permisos, 'asistencia');
  const canRegCalendario  = puedeRegistrar(permisos, 'calendario');
  const canRegPE          = puedeRegistrar(permisos, 'punto_encuentro');

  const campusActivo = localStorage.getItem('campus_activo') || 'ags';

  return (
    <div className="app" data-campus={campusActivo} style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

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
                {info.title && <><span className="sep">/</span><span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{info.title}</span></>}
              </div>
              <h1 className="page-title"
                style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {info.title || 'Origen Campus Ags'}
              </h1>
            </div>
          </div>

          <div className="topbar-right">

            {/* Líder de ministerio — nombre de su ministerio (solo para ese rol) */}
            {role === ROLES.LIDER_MINISTERIO && liderPerfil.estado === 'ok' && liderPerfil.nombre && (
              <>
                <style>{`
.lmb{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:#FFF4EE;border:1px solid #FFE5D6;color:#112540;font-size:12.5px;font-weight:700;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lmb-dot{width:7px;height:7px;border-radius:50%;background:#FF6B2B;flex-shrink:0;}
@media(max-width:640px){.lmb{display:none;}}
`}</style>
                <span className="lmb" title={liderPerfil.nombre}>
                  <span className="lmb-dot" />{liderPerfil.nombre}
                </span>
              </>
            )}

            {/* Stewardship — Registrar ofrenda */}
            {isStewardship && isIngresos && canRegIngresos && (
              <button className="btn btn-primary" onClick={() => openOfrendasModal(null)}>
                <I.plus size={15} /><span className="topbar-btn-label"> Registrar Ofrenda</span>
              </button>
            )}

            {/* Stewardship — Registrar gasto por pagar */}
            {isStewardship && isGastosPorPagar && (
              <button className="btn btn-primary" onClick={() => openGastosModal(false)}>
                <I.plus size={15} /><span className="topbar-btn-label"> Registrar gasto</span>
              </button>
            )}

            {/* Asistencia — solo si tiene permiso de registrar en asistencia (stewardship: true) */}
            {isAsistencia && canRegAsistencia && (
              <button className="btn btn-primary" onClick={() => openAsistenciaModal()}>
                <I.plus size={15} /><span className="topbar-btn-label"> Registrar Asistencia</span>
              </button>
            )}

            {/* Calendario — solo si tiene permiso de registrar en calendario */}
            {isCalendario && canRegCalendario && (
              <button className="btn btn-primary" onClick={() => openCalendarioModal()}>
                <I.plus size={15} /><span className="topbar-btn-label"> Registrar Evento</span>
              </button>
            )}

            <button className="icon-btn" aria-label="Notificaciones" style={{ position: 'relative' }}>
              <I.bell size={17} />
              {role === ROLES.VOLUNTARIO && puestosNuevos > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 6, width: 8, height: 8,
                  borderRadius: '50%', background: '#FF6B2B', border: '2px solid #fff',
                }} />
              )}
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
