import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const CAMPUS_META = {
  ags: { dot: '#3E6399', label: 'Aguascalientes' },
  gdl: { dot: '#888',    label: 'Matriz · Guadalajara' },
};

const CSS = `
.ocp-root{background:#0B1A2F;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;overflow:hidden;position:relative;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;}
.ocp-wrap{max-width:680px;width:100%;text-align:center;position:relative;z-index:1;}
.ocp-brand{width:220px;height:auto;margin:0 auto 30px;display:block;}
.ocp-eyebrow{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#9CB0CC;margin:0 0 12px;}
.ocp-title{font-size:30px;font-weight:800;letter-spacing:-.03em;color:#fff;margin:0 0 32px;}
.ocp-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.ocp-card{border:1px solid rgba(255,255,255,.10);border-radius:20px;padding:34px 26px 26px;background:rgba(255,255,255,.03);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:18px;position:relative;overflow:hidden;font-family:inherit;text-align:center;transition:border-color .18s,background .18s,transform .18s,box-shadow .18s;}
.ocp-card:hover{border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.06);transform:translateY(-4px);box-shadow:0 18px 44px rgba(0,0,0,.4);}
.ocp-accent{position:absolute;left:0;right:0;bottom:0;height:3px;background:#FF6B2B;transform:scaleX(0);transform-origin:left;transition:transform .2s;}
.ocp-card:hover .ocp-accent{transform:scaleX(1);}
.ocp-tile{width:96px;height:96px;min-width:96px;min-height:96px;max-width:96px;max-height:96px;border-radius:22px;flex-shrink:0;flex-grow:0;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 8px 22px rgba(0,0,0,.35);}
.ocp-tile-ags{background:#C1644A;}
.ocp-tile-ags img{width:100%;height:100%;object-fit:cover;border-radius:22px;display:block;}
.ocp-tile-gdl{background:#111111;}
.ocp-tile-gdl img{width:60px;height:auto;display:block;}
.ocp-name{font-size:18px;font-weight:800;letter-spacing:-.02em;color:#fff;margin:0 0 6px;}
.ocp-meta{display:flex;align-items:center;justify-content:center;gap:7px;font-size:12.5px;color:#9CB0CC;margin:0;}
.ocp-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;display:inline-block;}
.ocp-foot{margin:30px 0 0;font-size:11.5px;color:#9CB0CC;opacity:.7;}
.ocp-glow-tr{position:absolute;top:-180px;right:-140px;width:540px;height:540px;border-radius:50%;background:radial-gradient(circle,rgba(255,107,43,.16),transparent 68%);pointer-events:none;}
.ocp-glow-bl{position:absolute;bottom:-220px;left:-160px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(48,81,129,.4),transparent 70%);pointer-events:none;}
.ocp-loading{color:#9CB0CC;font-size:14px;}
@media(max-width:560px){
  .ocp-grid{gap:10px;}
  .ocp-card{padding:20px 12px;}
  .ocp-tile{width:64px;height:64px;min-width:64px;min-height:64px;max-width:64px;max-height:64px;}
  .ocp-tile-gdl img{width:40px;}
}
`;

function CampusTile({ campus }) {
  if (campus.id === 'ags') {
    return <div className="ocp-tile ocp-tile-ags"><img src="/assets/logo-origen-ags.jpeg" alt="Campus Aguascalientes" /></div>;
  }
  if (campus.id === 'gdl') {
    return <div className="ocp-tile ocp-tile-gdl"><img src="/assets/origen-mark.png" alt="Campus Guadalajara" /></div>;
  }
  return (
    <div className="ocp-tile" style={{ background: '#244169' }}>
      {campus.logo_url
        ? <img src={campus.logo_url} alt={campus.nombre} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
        : <span style={{ fontSize:36, fontWeight:800, color:'#fff', lineHeight:1 }}>{campus.nombre?.charAt(0).toUpperCase() ?? '?'}</span>}
    </div>
  );
}

export default function CampusPage() {
  const [campusList, setCampusList] = useState([]);
  const [loading, setLoading] = useState(true);
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
    <div className="ocp-root">
      <style>{CSS}</style>
      <div className="ocp-glow-tr" />
      <div className="ocp-glow-bl" />
      <div className="ocp-wrap">
        <img src="/assets/origen-mark.png" alt="Origen" className="ocp-brand" />
        <p className="ocp-eyebrow">Origen Dashboard</p>
        <h1 className="ocp-title">Elige tu campus</h1>
        {loading ? (
          <p className="ocp-loading">Cargando…</p>
        ) : (
          <div className="ocp-grid">
            {campusList.map((campus) => {
              const meta = CAMPUS_META[campus.id];
              return (
                <button key={campus.id} className="ocp-card" onClick={() => handleSelect(campus.id)}>
                  <div className="ocp-accent" />
                  <CampusTile campus={campus} />
                  <div>
                    <p className="ocp-name">{campus.nombre}</p>
                    <p className="ocp-meta">
                      <span className="ocp-dot" style={{ background: meta?.dot ?? '#888' }} />
                      {meta?.label ?? campus.nombre}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <p className="ocp-foot">Dashboard interno · Origen</p>
      </div>
    </div>
  );
}
