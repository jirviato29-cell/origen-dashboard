import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Pantalla de ENTRADA "Elige tu campus" (v2). Cada tarjeta ES su campus: usa el
// gradiente, el halo y el acento de esa identidad, para que el usuario aprenda
// el color desde la entrada. Implementa el HTML de referencia
// (referencia-Selector-Campus-v2.html / SPEC-Selector-Campus-v2.md).
//
// Los tokens de color de la TARJETA van locales aquí (no en campusTema) porque
// esta pantalla trae un segundo tono de gradiente (bg2) y un menta propio para
// Gdl (#2FD3B8) que son exclusivos de este diseño de entrada.
//
// Logos: se usan los ORIGINALES de marca del repo (a sangre, object-fit:cover),
// no las reconstrucciones degradadas de la referencia. Gdl = logo-origen.jpeg
// (cuadro negro oficial); el wordmark del encabezado = origen-mark-blanco.png.
const CARD = {
  ags: { cls: 'ecs-ags', name: 'Aguascalientes', tag: 'Campus', loc: 'Aguascalientes, Ags.',
         logo: '/assets/logo-origen-ags.jpeg', alt: 'Origen Aguascalientes' },
  gdl: { cls: 'ecs-gdl', name: 'Guadalajara',    tag: 'Matriz', loc: 'Guadalajara, Jal.',
         logo: '/assets/logo-origen.jpeg',       alt: 'Origen Guadalajara' },
  mid: { cls: 'ecs-mer', name: 'Mérida',         tag: 'Campus', loc: 'Mérida, Yuc.',
         logo: '/assets/logo-origen-mid.png',    alt: 'Origen Mérida' },
};

const Arrow = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CSS = `
.ecs-root{
  --ags-bg:#0B1A2F; --ags-2:#153252; --ags-ac:#FF6B2B;
  --gdl-bg:#0A0A0A; --gdl-2:#1C1C1F; --gdl-ac:#2FD3B8;
  --mer-bg:#062A31; --mer-2:#0F4B56; --mer-ac:#FF9A5E;
  min-height:100vh;background:#07090F;color:#fff;-webkit-font-smoothing:antialiased;
  letter-spacing:-.006em;display:flex;align-items:center;justify-content:center;
  padding:48px 24px;position:relative;overflow:hidden;
  font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;}
/* fondo neutro con los halos de los 3 campus */
.ecs-root::before{content:"";position:absolute;top:-10%;left:8%;width:520px;height:520px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,107,43,.10),transparent 66%);pointer-events:none;}
.ecs-root::after{content:"";position:absolute;bottom:-14%;right:6%;width:600px;height:600px;border-radius:50%;
  background:radial-gradient(circle,rgba(47,211,184,.09),transparent 68%);pointer-events:none;}
.ecs-glow3{position:absolute;bottom:-6%;left:38%;width:460px;height:460px;border-radius:50%;
  background:radial-gradient(circle,rgba(42,157,166,.11),transparent 68%);pointer-events:none;}

.ecs-wrap{width:100%;max-width:1000px;position:relative;z-index:1;}

/* cabecera */
.ecs-head{text-align:center;margin-bottom:30px;}
.ecs-head img{width:186px;height:auto;display:block;margin:0 auto;}
.ecs-eye{margin-top:16px;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#7E8CA3;}
/* Título + subtítulo: van ABAJO, después de las tarjetas (no en el encabezado). */
.ecs-below{text-align:center;margin-top:30px;}
.ecs-h1{font-size:30px;font-weight:800;letter-spacing:-.035em;margin:0;}
.ecs-sub{font-size:14.5px;color:#8E9AAF;margin:9px 0 0;}

/* tarjetas */
.ecs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.ecs-card{
  position:relative;overflow:hidden;cursor:pointer;text-align:left;width:100%;
  border-radius:22px;padding:26px 24px 22px;
  border:1px solid rgba(255,255,255,.09);
  transition:transform .2s cubic-bezier(.3,.7,.3,1),box-shadow .2s,border-color .2s;
  display:flex;flex-direction:column;gap:20px;font-family:inherit;}
.ecs-card:hover{transform:translateY(-6px);border-color:rgba(255,255,255,.2);}
/* cada tarjeta ES su campus */
.ecs-ags{background:linear-gradient(165deg,var(--ags-2),var(--ags-bg) 62%);}
.ecs-ags:hover{box-shadow:0 22px 54px rgba(255,107,43,.22);}
.ecs-gdl{background:linear-gradient(165deg,var(--gdl-2),var(--gdl-bg) 62%);}
.ecs-gdl:hover{box-shadow:0 22px 54px rgba(47,211,184,.18);}
.ecs-mer{background:linear-gradient(165deg,var(--mer-2),var(--mer-bg) 62%);}
.ecs-mer:hover{box-shadow:0 22px 54px rgba(255,154,94,.2);}
/* halo del acento dentro de la tarjeta */
.ecs-halo{position:absolute;top:-70px;right:-60px;width:230px;height:230px;border-radius:50%;pointer-events:none;transition:opacity .2s;opacity:.75;}
.ecs-ags .ecs-halo{background:radial-gradient(circle,rgba(255,107,43,.20),transparent 68%);}
.ecs-gdl .ecs-halo{background:radial-gradient(circle,rgba(47,211,184,.16),transparent 68%);}
.ecs-mer .ecs-halo{background:radial-gradient(circle,rgba(255,154,94,.20),transparent 68%);}
.ecs-card:hover .ecs-halo{opacity:1;}
/* barra de acento inferior */
.ecs-card::after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;transform:scaleX(0);
  transform-origin:left;transition:transform .24s;}
.ecs-ags::after{background:var(--ags-ac);}
.ecs-gdl::after{background:var(--gdl-ac);}
.ecs-mer::after{background:var(--mer-ac);}
.ecs-card:hover::after{transform:scaleX(1);}

.ecs-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;position:relative;z-index:1;}
.ecs-mark{width:88px;height:88px;border-radius:22px;overflow:hidden;flex-shrink:0;
  border:1px solid rgba(255,255,255,.16);box-shadow:0 6px 18px rgba(0,0,0,.35);}
.ecs-mark img{width:100%;height:100%;object-fit:cover;display:block;}
.ecs-tag{font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  padding:5px 10px;border-radius:7px;flex-shrink:0;}
.ecs-ags .ecs-tag{background:rgba(255,107,43,.16);color:#FFA470;}
.ecs-gdl .ecs-tag{background:rgba(47,211,184,.15);color:#6FE3CE;}
.ecs-mer .ecs-tag{background:rgba(255,154,94,.16);color:#FFB183;}

.ecs-body{position:relative;z-index:1;}
.ecs-name{font-size:22px;font-weight:800;letter-spacing:-.03em;line-height:1.1;display:block;}
.ecs-loc{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;margin-top:8px;}
.ecs-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.ecs-ags .ecs-loc{color:#9FB3CE;} .ecs-ags .ecs-dot{background:var(--ags-ac);}
.ecs-gdl .ecs-loc{color:#A3A3A8;} .ecs-gdl .ecs-dot{background:var(--gdl-ac);}
.ecs-mer .ecs-loc{color:#8FC2C8;} .ecs-mer .ecs-dot{background:var(--mer-ac);}

.ecs-enter{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding-top:16px;border-top:1px solid rgba(255,255,255,.1);position:relative;z-index:1;
  font-size:13.5px;font-weight:800;color:#fff;}
.ecs-arrow{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;
  border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);transition:.2s;flex-shrink:0;}
.ecs-arrow svg{width:16px;height:16px;}
.ecs-ags:hover .ecs-arrow{background:var(--ags-ac);border-color:var(--ags-ac);color:#231005;}
.ecs-gdl:hover .ecs-arrow{background:var(--gdl-ac);border-color:var(--gdl-ac);color:#04211C;}
.ecs-mer:hover .ecs-arrow{background:var(--mer-ac);border-color:var(--mer-ac);color:#2A1408;}

.ecs-foot{text-align:center;margin-top:16px;font-size:12.5px;color:#66718A;}
.ecs-loading{text-align:center;color:#8E9AAF;font-size:14px;}

@media(max-width:880px){.ecs-grid{grid-template-columns:1fr;}.ecs-h1{font-size:26px;}}
`;

// Tarjeta de un campus no reconocido (por si el API devuelve uno nuevo): estilo
// neutro navy, sin gradiente de identidad propia.
function fallbackCard(campus) {
  return { cls: 'ecs-ags', name: campus.nombre || campus.id, tag: 'Campus',
           loc: campus.nombre || '', logo: campus.logo_url || '/assets/origen-mark.png',
           alt: campus.nombre || 'Campus' };
}

export default function CampusPage() {
  const [campusList, setCampusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_URL}/campus`)
      .then(r => setCampusList(r.data.filter(c => c.activo !== false)))
      .catch(() => setCampusList([
        { id: 'ags' }, { id: 'gdl' }, { id: 'mid' },
      ]))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (campusId) => {
    localStorage.setItem('campus_activo', campusId);
    navigate('/login');
  };

  return (
    <div className="ecs-root">
      <style>{CSS}</style>
      <div className="ecs-glow3" />
      <div className="ecs-wrap">
        <div className="ecs-head">
          <img src="/assets/origen-mark-blanco.png" alt="Origen" />
          <div className="ecs-eye">Origen Dashboard</div>
        </div>

        {loading ? (
          <p className="ecs-loading">Cargando…</p>
        ) : (
          <div className="ecs-grid">
            {campusList.map((campus) => {
              const c = CARD[campus.id] || fallbackCard(campus);
              return (
                <button key={campus.id} type="button" className={`ecs-card ${c.cls}`} onClick={() => handleSelect(campus.id)}>
                  <span className="ecs-halo" />
                  <span className="ecs-top">
                    <span className="ecs-mark"><img src={c.logo} alt={c.alt} /></span>
                    <span className="ecs-tag">{c.tag}</span>
                  </span>
                  <span className="ecs-body">
                    <span className="ecs-name">{c.name}</span>
                    <span className="ecs-loc"><span className="ecs-dot" />{c.loc}</span>
                  </span>
                  <span className="ecs-enter">
                    Entrar al tablero
                    <span className="ecs-arrow">{Arrow}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="ecs-below">
          <h1 className="ecs-h1">Elige tu campus</h1>
          <p className="ecs-sub">Cada campus tiene su propio tablero y sus propios equipos.</p>
        </div>

        <div className="ecs-foot">Dashboard interno · Origen</div>
      </div>
    </div>
  );
}
