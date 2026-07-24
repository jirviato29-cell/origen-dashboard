import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { puedeRegistrar } from '../permissions';
import { useRegistrarModal } from '../context/RegistrarModalContext';
import { useOfrendasModal } from '../context/OfrendasModalContext';
import usePuestosNuevos from '../hooks/usePuestosNuevos';
import { I } from './Icons';

// ─── Nav config ───────────────────────────────────────────────────────────────

const navByRole = {
  [ROLES.ADMINISTRACION]: [
    { group: 'Administración', items: [
      { to: '/administracion',          label: 'Dashboard',     icon: I.home,     end: true },
      { to: '/administracion/ingresos', label: 'Ingresos',      icon: I.wallet },
      { to: '/administracion/gastos',   label: 'Gastos',        icon: I.chart },
      { to: '/administracion/mensual',  label: 'Vista Mensual', icon: I.calendar },
    ]},
  ],
  [ROLES.PASTOR]: [
    { group: 'Pastor', items: [
      { to: '/pastor',                 label: 'Dashboard',          icon: I.dashboard, end: true },
      { to: '/pastor/ingresos',        label: 'Ingresos',           icon: I.arrowBarDown },
      { to: '/pastor/gastos',          label: 'Gastos pagados',     icon: I.arrowBarUp },
      { to: '/pastor/balance',              label: 'Finanzas',             icon: I.scale },
      { to: '/pastor/ofrendas-especiales', label: 'Ofrendas especiales',  icon: I.coin },
      { to: '/pastor/asistencia',          label: 'Asistencia',           icon: I.users },
      { to: '/pastor/punto-encuentro',     label: 'Punto de Encuentro', icon: I.pin },
      { to: '/pastor/bienvenida-a-casa',   label: 'Bienvenida a Casa',  icon: I.home },
      { to: '/pastor/calendario',          label: 'Calendario',         icon: I.calendar },
    ]},
  ],
  [ROLES.ANFITRIONES]: [
    { group: 'Comunidad', items: [
      { to: '/anfitriones/asistencia',  label: 'Asistencia',            icon: I.users },
      { to: '/anfitriones/voluntarios', label: 'Directorio voluntarios', icon: I.users },
      { to: '/anfitriones/calendario',  label: 'Calendario',            icon: I.calendar },
    ]},
  ],
  [ROLES.PUNTO_ENCUENTRO]: [
    { group: 'Punto de Encuentro', items: [
      { to: '/punto_encuentro',                    label: 'Punto de Encuentro', icon: I.pin,      end: true },
      { to: '/punto_encuentro/gastos-eventos',     label: 'Gastos de eventos',  icon: I.receipt,  end: false },
      { to: '/punto_encuentro/bienvenida-a-casa',  label: 'Bienvenida a Casa',  icon: I.home },
      { to: '/punto_encuentro/calendario',         label: 'Calendario',         icon: I.calendar },
      { to: '/punto_encuentro/asistencia',         label: 'Asistencia',         icon: I.users },
    ]},
  ],
  [ROLES.STEWARDSHIP]: [
    { group: 'Stewardship', items: [
      { to: '/stewardship', label: 'Dashboard', icon: I.dashboard, end: true },
      {
        accordion: true,
        label: 'Ofrendas y Diezmos',
        icon: I.coin,
        defaultOpen: true,
        children: [
          { to: '/stewardship/ingresos',             label: 'Ingresos',             icon: I.arrowBarDown },
          { to: '/stewardship/gastos',               label: 'Gastos pagados',       icon: I.arrowBarUp },
          { to: '/stewardship/gastos-por-pagar',     label: 'Gastos por pagar',     icon: I.clock },
          { to: '/stewardship/balance',              label: 'Finanzas',             icon: I.scale },
          { to: '/stewardship/ofrendas-especiales',  label: 'Ofrendas especiales',  icon: I.coin },
        ],
      },
      { to: '/stewardship/asistencia',        label: 'Asistencia',              icon: I.users },
      { to: '/stewardship/punto-encuentro',   label: 'Punto de Encuentro',     icon: I.pin },
      { to: '/stewardship/gastos-eventos',    label: 'Gastos de eventos',      icon: I.receipt },
      { to: '/stewardship/bienvenida-a-casa', label: 'Bienvenida a Casa',      icon: I.home },
      { to: '/stewardship/voluntarios',       label: 'Directorio voluntarios',  icon: I.users },
      { to: '/stewardship/calendario',        label: 'Calendario',              icon: I.calendar },
      { to: '/stewardship/equipos',           label: 'Líderes y equipos',       icon: I.users },
      { to: '/stewardship/configuracion',     label: 'Configuración',           icon: I.settings },
    ]},
  ],
  [ROLES.LIDER_MINISTERIO]: [
    { group: 'Ministerio', items: [
      { to: '/lider_ministerio/voluntarios', label: 'Mis voluntarios',    icon: I.users },
      { to: '/lider_ministerio/posiciones',  label: 'Posiciones',         icon: I.pin },
      { to: '/lider_ministerio/programar',   label: 'Programar servicio', icon: I.calendar },
      { to: '/lider_ministerio/tablero',     label: 'Quién va dónde',     icon: I.dashboard },
      { to: '/lider_ministerio/configuracion', label: 'Configuración',    icon: I.settings },
    ]},
  ],
  [ROLES.VOLUNTARIO]: [
    { group: 'Voluntario', items: [
      { to: '/voluntario/calendario',    label: 'Mi calendario', icon: I.calendar },
      { to: '/voluntario/puestos',       label: 'Mis puestos',   icon: I.pin, badge: 'puestosNuevos' },
      { to: '/voluntario/configuracion', label: 'Configuración', icon: I.settings },
    ]},
  ],
};

const roleLabel = {
  [ROLES.ADMINISTRACION]:  'Administración',
  [ROLES.PASTOR]:          'Pastor Principal',
  [ROLES.ANFITRIONES]:     'Anfitriones',
  [ROLES.PUNTO_ENCUENTRO]: 'Punto de Encuentro',
  [ROLES.STEWARDSHIP]:     'Stewardship',
  [ROLES.LIDER_MINISTERIO]: 'Líder de Ministerio',
  [ROLES.VOLUNTARIO]:       'Voluntario',
};

const roleInitials = {
  [ROLES.ADMINISTRACION]:  'AD',
  [ROLES.PASTOR]:          'DM',
  [ROLES.ANFITRIONES]:     'MR',
  [ROLES.PUNTO_ENCUENTRO]: 'PE',
  [ROLES.STEWARDSHIP]:     'SW',
  [ROLES.LIDER_MINISTERIO]: 'LM',
  [ROLES.VOLUNTARIO]:       'VO',
};

// ─── Accordion nav item ────────────────────────────────────────────────────────

function NavAccordion({ item, onClose }) {
  const [open, setOpen] = useState(item.defaultOpen ?? true);
  const Ic = item.icon;

  return (
    <>
      <button className="nav-item" onClick={() => setOpen(o => !o)}>
        <span className="nav-icon"><Ic size={18} /></span>
        <span className="nav-label">{item.label}</span>
        <span style={{
          display: 'inline-flex', flexShrink: 0, opacity: 0.5,
          transition: 'transform 0.18s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          <I.chevR size={13} />
        </span>
      </button>

      {open && (
        <div style={{ paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {item.children.map(child => {
            const CIc = child.icon;
            return (
              <NavLink
                key={child.to}
                to={child.to}
                end={child.end}
                onClick={onClose}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                style={{ fontSize: 13 }}
              >
                <span className="nav-icon" style={{ opacity: 0.8 }}><CIc size={15} /></span>
                <span className="nav-label">{child.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({ onClose }) {
  const { role, userName, permisos, logout } = useAuth();
  const navigate = useNavigate();
  const { openModal } = useRegistrarModal();
  const { openModal: openOfrendasModal } = useOfrendasModal();
  // Badge de "Mis puestos": solo para el voluntario. Para los demás roles pasa
  // enabled=false, así el hook no hace ninguna llamada (gateado como useLiderPerfil).
  const { nuevos: puestosNuevos } = usePuestosNuevos(role === ROLES.VOLUNTARIO);
  const sections = navByRole[role] || [];
  const campusActivo = localStorage.getItem('campus_activo') || 'ags';
  const logoSrc = campusActivo === 'gdl' ? '/assets/origen-mark-blanco.png' : '/assets/origen-logo-white.png';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="sidebar" style={{ width: '100%' }}>

      {/* Logo */}
      <div className="sidebar-brand">
        <img
          src={logoSrc}
          alt="Origen"
          style={{ width: '140px', height: 'auto' }}
        />

        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden"
            style={{
              position: 'absolute', top: 16, right: 14,
              background: 'transparent', border: 0,
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
            aria-label="Cerrar menú"
          >
            <I.x size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflow: 'auto' }}>
        {sections.map((sec) => (
          <div key={sec.group}>
            <div className="nav-section-label">{sec.group}</div>
            {sec.items.map((item) => {
              const Ic = item.icon;

              if (item.accordion) {
                return <NavAccordion key={item.label} item={item} onClose={onClose} />;
              }

              if (item.action === 'registrar') {
                // Ocultar si el rol no tiene permiso de registrar en esa sección
                if (!puedeRegistrar(permisos, item.seccion)) return null;
                return (
                  <button
                    key="registrar"
                    className="nav-item action"
                    onClick={() => { openModal(); onClose?.(); }}
                  >
                    <span className="nav-icon"><Ic size={18} /></span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                );
              }

              if (item.action === 'ofrendas') {
                return (
                  <button
                    key="ofrendas"
                    className="nav-item action"
                    onClick={() => { openOfrendasModal(); onClose?.(); }}
                  >
                    <span className="nav-icon"><Ic size={18} /></span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="nav-icon"><Ic size={18} /></span>
                  <span className="nav-label">{item.label}</span>
                  {item.badge === 'puestosNuevos' && puestosNuevos > 0 && (
                    <span style={{
                      marginLeft: 'auto', minWidth: 18, height: 18, padding: '0 5px',
                      borderRadius: 9, background: '#FF6B2B', color: '#fff', fontSize: 11,
                      fontWeight: 800, display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, lineHeight: 1,
                    }}>{puestosNuevos}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer – nombre real + rol + logout */}
      <div className="sidebar-footer">
        <div className="avatar">
          {userName ? userName.charAt(0).toUpperCase() : (roleInitials[role] ?? '?')}
        </div>
        <div className="user-meta" style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">{userName || roleLabel[role]}</div>
          <div className="user-role">{roleLabel[role]}</div>
        </div>
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          style={{
            background: 'transparent', border: 0,
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
          aria-label="Cerrar sesión"
        >
          <I.back size={16} />
        </button>
      </div>
    </aside>
  );
}
