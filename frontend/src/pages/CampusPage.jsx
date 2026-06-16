import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const CAMPUS_META = {
  ags: { dot: '#3E6499', label: 'Aguascalientes' },
  gdl: { dot: '#888',    label: 'Matriz · Guadalajara' },
};

// ─── Tile de campus ───────────────────────────────────────────────────────────

function CampusTile({ campus }) {
  if (campus.id === 'ags') {
    return (
      <div style={{
        width: 96, height: 96, borderRadius: 22,
        background: '#C1644A', overflow: 'hidden', flexShrink: 0,
        boxShadow: '0 8px 22px rgba(0,0,0,.35)',
      }}>
        <img
          src="/assets/logo-origen-ags.jpeg"
          alt="Campus Aguascalientes"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 22, display: 'block' }}
        />
      </div>
    );
  }

  if (campus.id === 'gdl') {
    return (
      <div style={{
        width: 96, height: 96, borderRadius: 22,
        background: '#111111', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 22px rgba(0,0,0,.35)',
      }}>
        <img
          src="/assets/logo-origen.jpeg"
          alt="Campus Guadalajara"
          style={{ width: 60, height: 'auto', display: 'block' }}
        />
      </div>
    );
  }

  // Campus dinámico desde API
  return (
    <div style={{
      width: 96, height: 96, borderRadius: 22,
      background: '#244169', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', boxShadow: '0 8px 22px rgba(0,0,0,.35)',
    }}>
      {campus.logo_url ? (
        <img
          src={campus.logo_url}
          alt={campus.nombre}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
          {campus.nombre?.charAt(0).toUpperCase() ?? '?'}
        </span>
      )}
    </div>
  );
}

// ─── Tarjeta de campus ────────────────────────────────────────────────────────

function CampusCard({ campus, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const meta      = CAMPUS_META[campus.id];
  const dotColor  = meta?.dot   ?? '#888';
  const metaLabel = meta?.label ?? campus.nombre;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border:       `1px solid ${hovered ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.10)'}`,
        borderRadius: 20,
        padding:      '34px 26px 26px',
        background:   hovered ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.03)',
        cursor:       'pointer',
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        gap:          18,
        position:     'relative',
        overflow:     'hidden',
        transform:    hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow:    hovered ? '0 18px 44px rgba(0,0,0,.4)' : 'none',
        transition:   'border-color .18s, background .18s, transform .18s, box-shadow .18s',
        fontFamily:   'inherit',
        textAlign:    'center',
      }}
    >
      {/* Acento naranja inferior */}
      <div style={{
        position:        'absolute',
        left: 0, right: 0, bottom: 0,
        height:          3,
        background:      '#FF6B2B',
        transform:       hovered ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'left',
        transition:      'transform .2s',
      }} />

      <CampusTile campus={campus} />

      {/* Nombre */}
      <div>
        <p style={{
          fontSize: 18, fontWeight: 800, letterSpacing: '-.02em',
          color: '#fff', margin: '0 0 6px',
        }}>
          {campus.nombre}
        </p>

        {/* Meta-línea con dot */}
        <p style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 7, fontSize: 12.5, color: '#9CB0CC', margin: 0,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: dotColor, flexShrink: 0, display: 'inline-block',
          }} />
          {metaLabel}
        </p>
      </div>
    </button>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CampusPage() {
  const [campusList, setCampusList] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_URL}/campus`)
      .then(r => setCampusList(r.data.filter(c => c.activo !== false)))
      .catch(() => setCampusList([
        { id: 'ags', nombre: 'Campus Ags' },
        { id: 'gdl', nombre: 'Campus Gdl' },
      ]))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (campusId) => {
    localStorage.setItem('campus_activo', campusId);
    navigate('/login');
  };

  return (
    <div style={{
      background:  '#0B1A2F',
      minHeight:   '100vh',
      display:     'flex',
      alignItems:  'center',
      justifyContent: 'center',
      padding:     '40px 20px',
      overflow:    'hidden',
      position:    'relative',
      fontFamily:  '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>

      {/* Glow naranja top-right */}
      <div style={{
        position: 'absolute', top: -180, right: -140,
        width: 540, height: 540, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,107,43,.16), transparent 68%)',
        pointerEvents: 'none',
      }} />

      {/* Glow azul bottom-left */}
      <div style={{
        position: 'absolute', bottom: -220, left: -160,
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(48,81,129,.4), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Contenedor central */}
      <div style={{
        maxWidth: 680, width: '100%',
        textAlign: 'center', position: 'relative', zIndex: 1,
      }}>

        {/* Logo — mismo que Sidebar */}
        <img
          src="/assets/origen-logo-white.png"
          alt="Origen"
          style={{ width: 220, height: 'auto', marginBottom: 30, display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
        />

        {/* Eyebrow */}
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.16em',
          textTransform: 'uppercase', color: '#9CB0CC',
          margin: '0 0 12px',
        }}>
          Origen Dashboard
        </p>

        {/* Título */}
        <h1 style={{
          fontSize: 30, fontWeight: 800, letterSpacing: '-.03em',
          color: '#fff', margin: '0 0 32px',
        }}>
          Elige tu campus
        </h1>

        {/* Grid de campus */}
        {loading ? (
          <p style={{ color: '#9CB0CC', fontSize: 14 }}>Cargando…</p>
        ) : (
          <div className="campus-grid">
            {campusList.map(campus => (
              <CampusCard
                key={campus.id}
                campus={campus}
                onSelect={() => handleSelect(campus.id)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <p style={{
          marginTop: 30, fontSize: 11.5,
          color: '#9CB0CC', opacity: 0.7,
          margin: '30px 0 0',
        }}>
          Dashboard interno · Origen
        </p>

      </div>
    </div>
  );
}
