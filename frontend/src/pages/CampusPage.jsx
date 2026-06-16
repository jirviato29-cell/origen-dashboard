import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const CAMPUS_COLORS    = { ags: '#112540', gdl: '#FF6B2B' };
const CAMPUS_INITIALS  = { ags: 'A',       gdl: 'G'       };

export default function CampusPage() {
  const [campusList, setCampusList] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_URL}/campus`)
      .then(r => setCampusList(r.data.filter(c => c.activo !== false)))
      .catch(() => setCampusList([
        { id: 'ags', nombre: 'Aguascalientes' },
        { id: 'gdl', nombre: 'Guadalajara'    },
      ]))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (campusId) => {
    localStorage.setItem('campus_activo', campusId);
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0B1A2F',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', fontFamily: 'var(--font-ui)',
      position: 'relative', overflowX: 'hidden',
    }}>

      {/* Glows de fondo */}
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

      <div style={{ width: '100%', maxWidth: 680, position: 'relative', zIndex: 1 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <img
            src="/assets/origen-logo-white.png"
            alt="Origen"
            style={{ width: 160, height: 'auto' }}
          />
          <div style={{
            marginTop: 18, fontSize: 11, fontWeight: 600,
            letterSpacing: '.14em', textTransform: 'uppercase', color: '#9CB0CC',
          }}>
            Origen Dashboard
          </div>
          <h1 style={{
            margin: '8px 0 0', fontSize: 26, fontWeight: 800,
            letterSpacing: '-.03em', color: '#fff',
          }}>
            Elige tu campus
          </h1>
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9CB0CC', fontSize: 14 }}>
            Cargando…
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
          }}>
            {campusList.map(campus => {
              const color   = CAMPUS_COLORS[campus.id]   || '#244169';
              const initial = CAMPUS_INITIALS[campus.id] || campus.nombre?.charAt(0).toUpperCase() || '?';

              return (
                <button
                  key={campus.id}
                  onClick={() => handleSelect(campus.id)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 22, padding: '40px 28px',
                    cursor: 'pointer', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
                    transition: 'transform .18s, border-color .18s, background .18s',
                    fontFamily: 'var(--font-ui)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform    = 'translateY(-4px)';
                    e.currentTarget.style.borderColor  = color;
                    e.currentTarget.style.background   = 'rgba(255,255,255,0.09)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform    = 'translateY(0)';
                    e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.10)';
                    e.currentTarget.style.background   = 'rgba(255,255,255,0.05)';
                  }}
                >
                  {/* Círculo con logo o inicial */}
                  <div style={{
                    width: 88, height: 88, borderRadius: '50%',
                    background: color, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {campus.logo_url ? (
                      <img
                        src={campus.logo_url}
                        alt={campus.nombre}
                        style={{ width: 52, height: 52, objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                        {initial}
                      </span>
                    )}
                  </div>

                  {/* Nombre */}
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>
                    {campus.nombre}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
