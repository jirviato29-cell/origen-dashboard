import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { I } from '../components/Icons';

const ROLES_LIST = [
  { id: ROLES.PASTOR,          label: 'Pastor',             desc: 'Vista completa del dashboard',          icon: I.heart },
  { id: ROLES.STEWARDSHIP,     label: 'Stewardship',        desc: 'Ofrendas, finanzas y administración',   icon: I.coin  },
  { id: ROLES.ANFITRIONES,     label: 'Anfitriones',        desc: 'Gestión de asistencia y bienvenida',    icon: I.hand  },
  { id: ROLES.PUNTO_ENCUENTRO, label: 'Punto de Encuentro', desc: 'Registro y seguimiento de eventos',     icon: I.pin   },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [name, setName]         = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (selected) inputRef.current?.focus();
  }, [selected]);

  const handleEnter = () => {
    if (!name.trim()) return;
    login(selected.id, name.trim());
    navigate(`/${selected.id}`);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#1A1A1A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <img
        src="/assets/origen-logo-white.png"
        alt="Origen Aguascalientes"
        style={{ width: 180, height: 'auto', marginBottom: 32 }}
      />

      <div style={{
        width: '100%', maxWidth: 420,
        background: '#FFFFFF', borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        {!selected ? (
          <>
            <div style={{ padding: '24px 24px 12px' }}>
              <p style={{ fontSize: 12.5, color: '#6B6B6B', marginBottom: 4 }}>Dashboard interno</p>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                Selecciona tu rol
              </h2>
            </div>

            <div>
              {ROLES_LIST.map((r) => {
                const Ic = r.icon;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelected(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 24px', borderTop: '1px solid #E5E5E5',
                      cursor: 'pointer', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, background: '#F0F0F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, color: '#1A1A1A',
                    }}>
                      <Ic size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A1A' }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 1 }}>{r.desc}</div>
                    </div>
                    <I.chevR size={15} />
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ padding: '28px 24px' }}>
            <button
              onClick={() => { setSelected(null); setName(''); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                color: '#6B6B6B', fontSize: 13, padding: 0, marginBottom: 24,
              }}
            >
              <I.back size={15} /> Volver
            </button>

            {(() => { const Ic = selected.icon; return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: '#F0F0F0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A1A1A',
                }}>
                  <Ic size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#1A1A1A' }}>{selected.label}</div>
                  <div style={{ fontSize: 12, color: '#6B6B6B' }}>Acceso seleccionado</div>
                </div>
              </div>
            ); })()}

            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: '#1A1A1A', marginBottom: 8,
            }}>
              ¿Cuál es tu nombre?
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEnter()}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1.5px solid #E5E5E5', fontSize: 15,
                outline: 'none', boxSizing: 'border-box', color: '#1A1A1A',
                marginBottom: 12, fontFamily: 'inherit',
              }}
              onFocus={e  => e.target.style.borderColor = '#1A1A1A'}
              onBlur={e   => e.target.style.borderColor = '#E5E5E5'}
            />
            <button
              onClick={handleEnter}
              disabled={!name.trim()}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: name.trim() ? '#1A1A1A' : '#E5E5E5',
                color: name.trim() ? '#FFFFFF' : '#A3A3A3',
                border: 'none', fontSize: 15, fontWeight: 600,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s', fontFamily: 'inherit',
              }}
            >
              Entrar
            </button>
          </div>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
        Dashboard interno · Origen Campus Ags
      </p>
    </div>
  );
}
