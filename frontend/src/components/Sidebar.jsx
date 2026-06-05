import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { useRegistrarModal } from '../context/RegistrarModalContext';
import { useOfrendasModal } from '../context/OfrendasModalContext';
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
      { to: '/pastor',            label: 'Resumen General', icon: I.home,  end: true },
      { to: '/pastor/finanzas',   label: 'Finanzas',        icon: I.wallet },
      { to: '/pastor/asistencia', label: 'Asistencia',      icon: I.users },
    ]},
  ],
  [ROLES.ANFITRIONES]: [
    { group: 'Anfitriones', items: [
      { action: 'registrar', label: 'Registrar Asistencia', icon: I.plus },
      { to: '/anfitriones/estadisticas', label: 'Estadísticas', icon: I.chart },
      { to: '/anfitriones/historial',    label: 'Historial',    icon: I.clock },
    ]},
  ],
  [ROLES.PUNTO_ENCUENTRO]: [
    { group: 'Punto de Encuentro', items: [
      { to: '/punto_encuentro', label: 'Registro', icon: I.pin, end: true },
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
          { to: '/stewardship/ingresos',         label: 'Ingresos',         icon: I.arrowBarDown },
          { to: '/stewardship/gastos',           label: 'Gastos pagados',   icon: I.arrowBarUp },
          { to: '/stewardship/gastos-por-pagar', label: 'Gastos por pagar', icon: I.clock },
          { to: '/stewardship/balance',          label: 'Finanzas',         icon: I.scale },
        ],
      },
      { to: '/stewardship/asistencia',      label: 'Asistencia',        icon: I.users },
      { to: '/stewardship/punto-encuentro', label: 'Punto de Encuentro', icon: I.pin },
      { to: '/stewardship/configuracion',   label: 'Configuración',      icon: I.settings },
    ]},
  ],
};

const roleLabel = {
  [ROLES.ADMINISTRACION]:  'Administración',
  [ROLES.PASTOR]:          'Pastor Principal',
  [ROLES.ANFITRIONES]:     'Anfitriones',
  [ROLES.PUNTO_ENCUENTRO]: 'Punto de Encuentro',
  [ROLES.STEWARDSHIP]:     'Stewardship',
};

const roleInitials = {
  [ROLES.ADMINISTRACION]:  'AD',
  [ROLES.PASTOR]:          'DM',
  [ROLES.ANFITRIONES]:     'MR',
  [ROLES.PUNTO_ENCUENTRO]: 'PE',
  [ROLES.STEWARDSHIP]:     'SW',
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
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const { openModal } = useRegistrarModal();
  const { openModal: openOfrendasModal } = useOfrendasModal();
  const sections = navByRole[role] || [];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="sidebar" style={{ width: '100%' }}>

      {/* Logo */}
      <div className="sidebar-brand">
        <img
          src="/assets/origen-logo-white.png"
          alt="Origen Aguascalientes"
          style={{ width: '140px', height: 'auto' }}
        />

        {/* Close button – mobile only */}
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
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer – avatar + role + logout */}
      <div className="sidebar-footer">
        <div className="avatar">{roleInitials[role] ?? '?'}</div>
        <div className="user-meta" style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">{roleLabel[role]}</div>
          <div className="user-role">Origen Campus Ags</div>
        </div>
        <button
          onClick={handleLogout}
          title="Cambiar rol"
          style={{
            background: 'transparent', border: 0,
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
          aria-label="Cambiar rol"
        >
          <I.back size={16} />
        </button>
      </div>
    </aside>
  );
}
