import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { I } from '../components/Icons';
import { useIsMobile } from '../utils/useIsMobile';

// ── Design tokens ──────────────────────────────────────────────────────────
const NAVY     = '#112540';
const NAVY_900 = '#0B1A2F';
const NAVY_700 = '#244169';
const NAVY_500 = '#4A6080';
const NAVY_300 = '#9CB0CC';
const NAVY_100 = '#DCE4EF';
const ORANGE     = '#FF6B2B';
const ORANGE_100 = '#FFE5D6';
const ORANGE_50  = '#FFF4EE';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';

// ── Helpers ────────────────────────────────────────────────────────────────
const DIAS_ES  = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
const MESES_ES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO',
                  'AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

function getGreetingLine() {
  const now  = new Date();
  const h    = now.getHours();
  const sal  = h < 12 ? 'BUEN DÍA' : h < 19 ? 'BUENAS TARDES' : 'BUENAS NOCHES';
  return `${sal} · ${DIAS_ES[now.getDay()]} ${now.getDate()} DE ${MESES_ES[now.getMonth()]}`;
}

const CHIP = {
  [ROLES.PASTOR]:          { dot: NAVY_700, label: 'ACCESO DE SOLO LECTURA'     },
  [ROLES.STEWARDSHIP]:     { dot: NAVY_700, label: 'INGRESOS · GASTOS · BALANCE' },
  [ROLES.ANFITRIONES]:     { dot: ORANGE,   label: 'ASISTENCIA · BIENVENIDA'    },
  [ROLES.PUNTO_ENCUENTRO]: { dot: NAVY_700, label: 'EVENTOS · PARTICIPANTES'    },
};

const ROLES_LIST = [
  { id: ROLES.PASTOR,          label: 'Pastor',             desc: 'Vista completa del dashboard',        icon: I.heart },
  { id: ROLES.STEWARDSHIP,     label: 'Stewardship',        desc: 'Ofrendas, finanzas y administración', icon: I.coin  },
  { id: ROLES.ANFITRIONES,     label: 'Anfitriones',        desc: 'Gestión de asistencia y bienvenida',  icon: I.hand  },
  { id: ROLES.PUNTO_ENCUENTRO, label: 'Punto de Encuentro', desc: 'Registro y seguimiento de eventos',   icon: I.pin   },
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

  const handleBack = () => { setSelected(null); setClave(''); setError(''); };

  const handleEnter = async () => {
    if (!clave.trim() || loading) return;
    setLoading(true);
    setError('');
    const result = await login(selected.id, clave.trim());
    setLoading(false);
    if (result.ok) navigate(`/${selected.id}`);
    else { setError(result.error); inputRef.current?.focus(); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: NAVY_900,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', fontFamily: 'var(--font-ui)',
    }}>

      {/* ── Logo area ─────────────────────────────────────────────────── */}
      <img
        src="/assets/origen-logo-white.png"
        alt="Origen"
        style={{ width: 160, height: 'auto', marginBottom: 6 }}
      />
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.45)', marginBottom: 8,
      }}>
        Aguascalientes
      </span>
      <p style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase',
        color: NAVY_300, margin: '0 0 26px', textAlign: 'center',
      }}>
        DASHBOARD INTERNO · CAMPUS AGUASCALIENTES
      </p>

      {!selected ? (
        <>
          {/* ── Role selector card ───────────────────────────────────── */}
          <div style={{
            width: '100%', maxWidth: 560,
            background: 'white', borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0,0,0,.40), 0 4px 16px rgba(0,0,0,.18)',
          }}>

            {/* Card header */}
            <div style={{ padding: '22px 24px 16px' }}>
              <p style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '.10em',
                textTransform: 'uppercase', color: ORANGE, margin: '0 0 8px',
              }}>
                {getGreetingLine()}
              </p>
              <h2 style={{ fontSize: 23, fontWeight: 800, color: NAVY, margin: '0 0 5px', letterSpacing: '-.02em' }}>
                Selecciona tu rol
              </h2>
              <p style={{ fontSize: 13, color: GRAY_500, margin: 0 }}>
                Entra al área que te corresponde para continuar.
              </p>
            </div>

            {/* 2×2 grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: 11,
              padding: '0 20px 20px',
            }}>
              {ROLES_LIST.map((r) => {
                const Ic  = r.icon;
                const chip = CHIP[r.id];
                const isH  = hovered === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelected(r)}
                    onMouseEnter={() => setHovered(r.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      background: 'white',
                      border: `1.5px solid ${isH ? ORANGE_100 : GRAY_200}`,
                      borderRadius: 14, padding: 15,
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      transform: isH ? 'translateY(-2px)' : 'none',
                      transition: 'border-color .14s, transform .14s, box-shadow .14s',
                      boxShadow: isH
                        ? '0 6px 20px rgba(255,107,43,.13)'
                        : '0 1px 3px rgba(0,0,0,.04)',
                    }}
                  >
                    {/* Icon tile + chevron */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 11 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: NAVY_100, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: NAVY_700,
                      }}>
                        <Ic size={18} />
                      </div>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: isH ? ORANGE_50 : GRAY_100,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isH ? ORANGE : NAVY_300,
                        transition: 'background .14s, color .14s',
                      }}>
                        <I.chevR size={13} />
                      </div>
                    </div>

                    {/* Title + description */}
                    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 3 }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 12.5, color: GRAY_500, marginBottom: 13, lineHeight: 1.4 }}>
                      {r.desc}
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: GRAY_100, margin: '0 0 10px' }} />

                    {/* Chip */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: chip.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', color: GRAY_500 }}>
                        {chip.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Card footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 24px', borderTop: `1px solid ${GRAY_100}`,
              flexWrap: 'wrap', gap: 8,
            }}>
              <p style={{ fontSize: 12, color: NAVY_300, margin: 0 }}>
                ¿No ves tu rol? Pídele acceso al administrador.
              </p>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: NAVY_700,
                padding: 0, fontFamily: 'var(--font-ui)',
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', background: GRAY_100,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: NAVY_700, lineHeight: 1, flexShrink: 0,
                }}>?</span>
                Ayuda
              </button>
            </div>
          </div>

          <p style={{ marginTop: 20, fontSize: 11, color: NAVY_500, textAlign: 'center' }}>
            Dashboard interno · Origen Campus Aguascalientes
          </p>
        </>
      ) : (
        <>
          {/* ── Password entry card ──────────────────────────────────── */}
          <div style={{
            width: '100%', maxWidth: 420,
            background: 'white', borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0,0,0,.40), 0 4px 16px rgba(0,0,0,.18)',
            padding: '28px 24px',
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

            {(() => { const Ic = selected.icon; return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: NAVY_100, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: NAVY_700,
                }}>
                  <Ic size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: NAVY }}>{selected.label}</div>
                  <div style={{ fontSize: 12, color: GRAY_500, marginTop: 1 }}>Acceso seleccionado</div>
                </div>
              </div>
            ); })()}

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 8 }}>
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
                fontSize: 15, outline: 'none', boxSizing: 'border-box', color: NAVY,
                marginBottom: error ? 6 : 16, fontFamily: 'var(--font-ui)',
              }}
              onFocus={e => e.target.style.borderColor = error ? '#EF4444' : NAVY}
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
                background: (clave.trim() && !loading) ? NAVY : GRAY_100,
                color: (clave.trim() && !loading) ? 'white' : GRAY_500,
                border: 'none', fontSize: 15, fontWeight: 700,
                cursor: (clave.trim() && !loading) ? 'pointer' : 'not-allowed',
                transition: 'background .15s', fontFamily: 'var(--font-ui)',
              }}
            >
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </div>

          <p style={{ marginTop: 20, fontSize: 11, color: NAVY_500, textAlign: 'center' }}>
            Dashboard interno · Origen Campus Aguascalientes
          </p>
        </>
      )}
    </div>
  );
}
