import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { I } from '../components/Icons';
import { useIsMobile } from '../utils/useIsMobile';

// ── Design tokens (del CSS de la referencia) ───────────────────────────────
const NAVY_950 = '#0B1A2F';
const NAVY_900 = '#112540';
const NAVY_700 = '#244169';
const NAVY_600 = '#305181';
const NAVY_500 = '#3E6499';
const NAVY_300 = '#9CB0CC';
const NAVY_100 = '#DCE4EF';
const ORANGE_600 = '#E0561B';
const ORANGE_500 = '#FF6B2B';
const ORANGE_50  = '#FFF4EE';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50  = '#F6F7F9';
const TEAL     = '#5C7A6F';
const TEAL_50  = '#EAF1EE';

// ── SVG íconos (exactos de la referencia) ─────────────────────────────────
const StarIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21.5 7.1 18.2l.9-5.5-4-3.9L9.5 8z" strokeLinejoin="round"/>
  </svg>
);
const WalletIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 7a2 2 0 0 1 2-2h13l3 4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <path d="M3 9h18"/>
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="9" cy="9" r="3.2"/>
    <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" strokeLinecap="round"/>
    <circle cx="17" cy="10" r="2.5"/>
  </svg>
);
const PinIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z"/>
    <circle cx="12" cy="9" r="2.5"/>
  </svg>
);
const ChevronRight = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const HelpCircleIcon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9"/>
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .8-1 1.7"/>
    <circle cx="12" cy="17" r=".5" fill="currentColor"/>
  </svg>
);

// ── Helpers de saludo ──────────────────────────────────────────────────────
const DIAS_CAP  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES_MIN = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function getGreetingLine() {
  const now = new Date();
  const h   = now.getHours();
  const sal = h < 12 ? 'Buen día' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${sal} · ${DIAS_CAP[now.getDay()]} ${now.getDate()} de ${MESES_MIN[now.getMonth()]}`;
}

// ── Datos de roles ─────────────────────────────────────────────────────────
const ROLES_LIST = [
  {
    id:         ROLES.PASTOR,
    label:      'Pastor',
    desc:       'Vista completa del dashboard',
    icon:       StarIcon,
    icBg:       NAVY_900,
    icColor:    '#fff',
    mdotColor:  NAVY_900,
    meta:       'Acceso de solo lectura',
  },
  {
    id:         ROLES.STEWARDSHIP,
    label:      'Stewardship',
    desc:       'Ofrendas, finanzas y administración',
    icon:       WalletIcon,
    icBg:       NAVY_100,
    icColor:    NAVY_600,
    mdotColor:  NAVY_600,
    meta:       'Ingresos · Gastos · Balance',
  },
  {
    id:         ROLES.ANFITRIONES,
    label:      'Anfitriones',
    desc:       'Gestión de asistencia y bienvenida',
    icon:       UsersIcon,
    icBg:       ORANGE_50,
    icColor:    ORANGE_600,
    mdotColor:  ORANGE_500,
    meta:       'Asistencia · Bienvenida',
  },
  {
    id:         ROLES.PUNTO_ENCUENTRO,
    label:      'Punto de Encuentro',
    desc:       'Registro y seguimiento de eventos',
    icon:       PinIcon,
    icBg:       TEAL_50,
    icColor:    TEAL,
    mdotColor:  TEAL,
    meta:       'Eventos · Participantes',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();

  const [selected, setSelected] = useState(null);
  const [clave,    setClave]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [hovered,  setHovered]  = useState(null);

  const inputRef = useRef(null);

  useEffect(() => {
    if (selected) inputRef.current?.focus();
  }, [selected]);

  const handleBack  = () => { setSelected(null); setClave(''); setError(''); };
  const handleEnter = async () => {
    if (!clave.trim() || loading) return;
    setLoading(true); setError('');
    const result = await login(selected.id, clave.trim());
    setLoading(false);
    if (result.ok) navigate(`/${selected.id}`);
    else { setError(result.error); inputRef.current?.focus(); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: NAVY_950,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', fontFamily: 'var(--font-ui)',
      position: 'relative', overflowX: 'hidden',
    }}>

      {/* Glows de fondo — equivalentes a body::before / body::after */}
      <div style={{
        position: 'absolute', top: -180, right: -140, width: 540, height: 540,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(255,107,43,.16), transparent 68%)',
      }} />
      <div style={{
        position: 'absolute', bottom: -220, left: -160, width: 600, height: 600,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(48,81,129,.4), transparent 70%)',
      }} />

      {/* Wrap (z-index sobre los glows) */}
      <div style={{ width: '100%', maxWidth: 680, position: 'relative', zIndex: 1 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <img
            src="/assets/origen-logo-white.png"
            alt="Origen Aguascalientes"
            style={{ width: 172, height: 'auto' }}
          />
          <div style={{
            marginTop: 14, fontSize: 12, fontWeight: 600,
            letterSpacing: '.14em', textTransform: 'uppercase', color: NAVY_300,
          }}>
            Dashboard interno · Campus Aguascalientes
          </div>
        </div>

        {!selected ? (
          <>
            {/* ── Panel principal ───────────────────────────────────── */}
            <div style={{
              background: '#fff', borderRadius: 22, padding: '30px 30px 26px',
              boxShadow: '0 30px 80px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.2)',
            }}>

              {/* Panel head */}
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
                  textTransform: 'uppercase', color: ORANGE_500, marginBottom: 7,
                }}>
                  {getGreetingLine()}
                </div>
                <h1 style={{
                  fontSize: 25, fontWeight: 800, letterSpacing: '-.03em',
                  color: NAVY_900, margin: 0,
                }}>
                  Selecciona tu rol
                </h1>
                <div style={{ fontSize: 13, color: GRAY_500, marginTop: 5 }}>
                  Entra al área que te corresponde para continuar.
                </div>
              </div>

              {/* Roles grid 2×2 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 13, marginTop: 22,
              }}>
                {ROLES_LIST.map((r) => {
                  const Ic = r.icon;
                  const isH = hovered === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelected(r)}
                      onMouseEnter={() => setHovered(r.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        display: 'flex', flexDirection: 'column', textAlign: 'left',
                        border: `1px solid ${isH ? NAVY_300 : GRAY_200}`,
                        borderRadius: 15, padding: 18, background: '#fff',
                        cursor: 'pointer', position: 'relative', overflow: 'hidden',
                        transform: isH ? 'translateY(-3px)' : 'translateY(0)',
                        boxShadow: isH ? '0 12px 30px rgba(11,26,47,.14)' : 'none',
                        transition: '.16s cubic-bezier(.3,.7,.3,1)',
                      }}
                    >
                      {/* Acento naranja inferior (::after) */}
                      <div style={{
                        position: 'absolute', left: 0, right: 0, bottom: 0, height: 3,
                        background: ORANGE_500,
                        transform: isH ? 'scaleX(1)' : 'scaleX(0)',
                        transformOrigin: 'left',
                        transition: 'transform .2s',
                      }} />

                      {/* role-top: ícono + flecha */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', marginBottom: 14,
                      }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: 13,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: r.icBg, color: r.icColor, flexShrink: 0,
                        }}>
                          <Ic />
                        </div>
                        <div style={{
                          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                          background: isH ? ORANGE_500 : GRAY_50,
                          border: `1px solid ${isH ? ORANGE_500 : GRAY_200}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isH ? '#fff' : GRAY_500,
                          transition: '.16s',
                        }}>
                          <ChevronRight />
                        </div>
                      </div>

                      {/* Nombre del rol */}
                      <div style={{
                        fontSize: 16, fontWeight: 800, letterSpacing: '-.02em', color: NAVY_900,
                      }}>
                        {r.label}
                      </div>

                      {/* Descripción */}
                      <div style={{
                        fontSize: 12.5, color: GRAY_500, marginTop: 3, lineHeight: 1.4,
                      }}>
                        {r.desc}
                      </div>

                      {/* Meta-línea */}
                      <div style={{
                        marginTop: 13, paddingTop: 12, borderTop: `1px solid ${GRAY_100}`,
                        fontSize: 11, fontWeight: 600, color: GRAY_500,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: r.mdotColor, flexShrink: 0,
                        }} />
                        {r.meta}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Panel footer */}
              <div style={{
                marginTop: 22, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
              }}>
                <span style={{ fontSize: 11.5, color: GRAY_500 }}>
                  ¿No ves tu rol? Pídele acceso al administrador.
                </span>
                <a href="#" style={{
                  fontSize: 12, fontWeight: 600, color: NAVY_700,
                  display: 'flex', alignItems: 'center', gap: 5,
                  textDecoration: 'none',
                }}>
                  <HelpCircleIcon /> Ayuda
                </a>
              </div>
            </div>

            {/* Copyright */}
            <div style={{
              textAlign: 'center', fontSize: 11, color: NAVY_500, marginTop: 20,
            }}>
              Dashboard interno · Origen Campus Aguascalientes
            </div>
          </>
        ) : (
          <>
            {/* ── Pantalla de clave ─────────────────────────────────── */}
            <div style={{
              background: '#fff', borderRadius: 22, padding: '30px 28px 28px',
              boxShadow: '0 30px 80px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.2)',
              maxWidth: 440, margin: '0 auto',
            }}>
              <button
                onClick={handleBack}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: GRAY_500, fontSize: 13, padding: 0, marginBottom: 24,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <I.back size={15} /> Volver
              </button>

              {(() => {
                const Ic = selected.icon;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 13,
                      background: selected.icBg, color: selected.icColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Ic />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.02em', color: NAVY_900 }}>
                        {selected.label}
                      </div>
                      <div style={{ fontSize: 12, color: GRAY_500, marginTop: 1 }}>Acceso seleccionado</div>
                    </div>
                  </div>
                );
              })()}

              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY_900, marginBottom: 8 }}>
                Clave de acceso
              </label>
              <input
                ref={inputRef}
                type="password"
                placeholder="••••••••"
                value={clave}
                onChange={e => { setClave(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleEnter()}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: `1.5px solid ${error ? '#EF4444' : GRAY_200}`,
                  fontSize: 15, outline: 'none', boxSizing: 'border-box', color: NAVY_900,
                  marginBottom: error ? 6 : 16, fontFamily: 'var(--font-ui)',
                }}
                onFocus={e => e.target.style.borderColor = error ? '#EF4444' : NAVY_900}
                onBlur={e  => e.target.style.borderColor = error ? '#EF4444' : GRAY_200}
              />

              {error && (
                <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#EF4444', fontWeight: 500 }}>
                  {error}
                </p>
              )}

              <button
                onClick={handleEnter}
                disabled={!clave.trim() || loading}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  background: (clave.trim() && !loading) ? NAVY_900 : GRAY_100,
                  color: (clave.trim() && !loading) ? '#fff' : GRAY_500,
                  border: 'none', fontSize: 15, fontWeight: 700,
                  cursor: (clave.trim() && !loading) ? 'pointer' : 'not-allowed',
                  transition: 'background .15s', fontFamily: 'var(--font-ui)',
                }}
              >
                {loading ? 'Verificando…' : 'Entrar'}
              </button>
            </div>

            <div style={{ textAlign: 'center', fontSize: 11, color: NAVY_500, marginTop: 20 }}>
              Dashboard interno · Origen Campus Aguascalientes
            </div>
          </>
        )}
      </div>
    </div>
  );
}
