import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { I } from '../components/Icons';
import RolesGdlScreen from './RolesGdlScreen';
import ClaveGdlScreen from './ClaveGdlScreen';

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
// Anfitriones: puerta abierta = recibir/dar la bienvenida. Sin figura humana,
// para no confundirse con Líder ni con Soy voluntario.
const DoorIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 4h3a2 2 0 0 1 2 2v14"/>
    <path d="M2 20h3M13 20h9"/>
    <path d="M13 4.6v16.2a1 1 0 0 1-1.2 1L5.2 20a1 1 0 0 1-.7-1V5.6a1 1 0 0 1 .8-1l6-1.5A1 1 0 0 1 13 4.6z"/>
    <path d="M10 12v.01"/>
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
// Líder de Ministerio: escudo con estrella sólida = liderar. Sin figura
// humana, para no confundirse con Soy voluntario (persona + más).
const LeaderIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21.5c4.5-2 7-5.5 7-9.5V5.5L12 2.8 5 5.5V12c0 4 2.5 7.5 7 9.5z"/>
    <path d="M12 8.2l1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z" fill="currentColor" stroke="none"/>
  </svg>
);
// Geometría de UserPlus (lucide). Inline porque el proyecto no usa
// lucide-react y no vale la pena una dependencia por un ícono.
const VolunteerIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M19 8v6M22 11h-6"/>
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
// El orden de este array es el orden del grid en AMBAS pantallas: gdl
// (RolesGdlScreen) lo recibe por props, así que no hay que reordenarlo allá.
// Grid de 3 columnas:
//   arriba: Pastor | Stewardship | Líder de Ministerio
//   abajo:  Punto de Encuentro | Anfitriones | [Soy voluntario]
// icon/icBg/icColor los sigue usando la pantalla de clave.
const ROLES_LIST = [
  {
    id:         ROLES.PASTOR,
    label:      'Pastor',
    desc:       'Vista completa del dashboard',
    icon:       StarIcon,
    icBg:       NAVY_900,
    icColor:    '#fff',
  },
  {
    id:         ROLES.STEWARDSHIP,
    label:      'Stewardship',
    desc:       'Logística',
    icon:       WalletIcon,
    icBg:       NAVY_100,
    icColor:    NAVY_600,
  },
  {
    id:         ROLES.LIDER_MINISTERIO,
    label:      'Líder de Ministerio',
    desc:       'Tu equipo de voluntarios',
    icon:       LeaderIcon,
    icBg:       NAVY_100,
    icColor:    NAVY_700,
  },
  {
    id:         ROLES.PUNTO_ENCUENTRO,
    label:      'Punto de Encuentro',
    desc:       'Registro y seguimiento de eventos',
    icon:       PinIcon,
    icBg:       TEAL_50,
    icColor:    TEAL,
  },
  {
    id:         ROLES.ANFITRIONES,
    label:      'Anfitriones',
    desc:       'Gestión de asistencia y bienvenida',
    icon:       DoorIcon,
    icBg:       ORANGE_50,
    icColor:    ORANGE_600,
  },
];

// ── Tarjetas de selección de rol ───────────────────────────────────────────
// En clases (no inline) porque necesitan media queries y :hover.
// Mismo diseño que la pantalla de GDL (RolesGdlScreen, prefijo ogr-).
const ROLES_CSS = `
.lr-roles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px;}
@media(max-width:900px){.lr-roles{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.lr-roles{grid-template-columns:1fr;}}
.lr-role{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 13px;border:1px solid ${GRAY_200};border-radius:12px;background:#fff;cursor:pointer;font-family:inherit;box-shadow:0 1px 2px rgba(11,26,47,.04);transition:.16s cubic-bezier(.3,.7,.3,1);}
.lr-role:hover{border-color:${ORANGE_500};background:${ORANGE_50};box-shadow:0 6px 16px rgba(11,26,47,.10);}
.lr-ic{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.lr-ic svg{width:18px;height:18px;}
.lr-role-text{display:flex;flex-direction:column;flex:1;min-width:0;}
.lr-name{font-size:13.5px;font-weight:600;letter-spacing:-.01em;color:${NAVY_900};}
.lr-desc{font-size:11px;color:${GRAY_500};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lr-arrow{display:flex;align-items:center;color:${NAVY_300};flex-shrink:0;transition:color .16s;}
.lr-arrow svg{width:16px;height:16px;}
.lr-role:hover .lr-arrow{color:${ORANGE_500};}
/* Botón de voluntario: 6a celda del grid. Comparte la geometría de la
   tarjeta (incluido .lr-ic, que le fija el alto) pero va en sólido para
   que se lea como un acceso aparte. */
.lr-vol{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 13px;border:1px solid ${ORANGE_500};border-radius:12px;background:${ORANGE_500};color:#fff;cursor:pointer;font-family:inherit;text-decoration:none;box-shadow:0 1px 2px rgba(11,26,47,.04);transition:.16s cubic-bezier(.3,.7,.3,1);}
.lr-vol:hover{background:${ORANGE_600};border-color:${ORANGE_600};box-shadow:0 6px 16px rgba(11,26,47,.10);}
.lr-vol-text{flex:1;min-width:0;font-size:13.5px;font-weight:600;letter-spacing:-.01em;color:#fff;}
.lr-vol .lr-arrow{color:#fff;}
`;

// ── Page ──────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const campusActivo = localStorage.getItem('campus_activo');

  const [selected, setSelected] = useState(null);
  const [clave,    setClave]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

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

  if (!selected && campusActivo === 'gdl') {
    return <RolesGdlScreen roles={ROLES_LIST} onSelect={setSelected} />;
  }

  if (selected && campusActivo === 'gdl') {
    return (
      <ClaveGdlScreen
        roleId={selected.id}
        clave={clave}
        setClave={setClave}
        onSubmit={handleEnter}
        onBack={handleBack}
        error={error}
        loading={loading}
      />
    );
  }

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
      {/* 880: con el ícono de vuelta, las 3 columnas necesitan este ancho
          para no truncar el subtítulo más largo */}
      <div style={{ width: '100%', maxWidth: 880, position: 'relative', zIndex: 1 }}>

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
            <style>{ROLES_CSS}</style>

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

              {/* Roles grid — 3 columnas: 3 arriba, 2 abajo */}
              <div className="lr-roles">
                {ROLES_LIST.map((r) => {
                  const Ic = r.icon;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className="lr-role"
                      onClick={() => setSelected(r)}
                    >
                      <span className="lr-ic" style={{ background: r.icBg, color: r.icColor }}>
                        <Ic />
                      </span>
                      <span className="lr-role-text">
                        <span className="lr-name">{r.label}</span>
                        <span className="lr-desc">{r.desc}</span>
                      </span>
                      <span className="lr-arrow"><ChevronRight /></span>
                    </button>
                  );
                })}

                {/* 6a celda: acceso de voluntarios, cierra la cuadrícula */}
                <Link to="/voluntario/login" className="lr-vol">
                  <span className="lr-ic"><VolunteerIcon /></span>
                  <span className="lr-vol-text">Soy voluntario</span>
                  <span className="lr-arrow"><ChevronRight /></span>
                </Link>
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
