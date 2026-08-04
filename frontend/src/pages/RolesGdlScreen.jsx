import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { paletaLogin } from '../theme/loginCampus';

// Colores neutros del diseño (idénticos en todos los campus: las tarjetas de rol
// son blancas con texto navy). El acento y los fondos oscuros salen del tema del
// campus vía paletaLogin(); ver más abajo.
const INK_300 = '#9A9A9A';
const NAVY_900 = '#112540';
const GRAY_500 = '#7A8699';
const GRAY_200 = '#E2E6EC';
const NAVY_300 = '#9CB0CC';

const Arrow = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// Geometría de UserPlus (lucide). Inline porque el proyecto no usa
// lucide-react y no vale la pena una dependencia por un ícono.
const VolunteerIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
  </svg>
);

const ROLE_STYLE = {
  pastor:          { name:'Pastor',              desc:'Vista completa del dashboard' },
  stewardship:     { name:'Stewardship',         desc:'Ofrendas, finanzas y administración' },
  anfitriones:     { name:'Anfitriones',         desc:'Gestión de asistencia y bienvenida' },
  punto_encuentro: { name:'Punto de Encuentro',  desc:'Registro y seguimiento de eventos' },
  lider_ministerio:{ name:'Líder de Ministerio', desc:'Tu equipo de voluntarios' },
};

// CSS parametrizado por la paleta del campus (p). Los tokens de marca (acento,
// fondo, panel, tintes de hover, glow) vienen de paletaLogin(); el resto es
// neutro. Para 'gdl' el resultado es idéntico a la versión anterior.
const cssFor = (p) => `
.ogr-root{background:${p.bg};min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;position:relative;overflow:hidden;color:#fff;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;}
.ogr-glow-tr{position:absolute;top:-180px;right:-140px;width:540px;height:540px;border-radius:50%;background:radial-gradient(circle,${p.glow},transparent 68%);pointer-events:none;}
.ogr-glow-bl{position:absolute;bottom:-220px;left:-160px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.05),transparent 70%);pointer-events:none;}
.ogr-wrap{width:100%;max-width:880px;position:relative;z-index:1;}
.ogr-brand{text-align:center;margin-bottom:34px;}
.ogr-brand img{width:172px;height:auto;display:block;margin-left:auto;margin-right:auto;}
.ogr-tag{margin-top:14px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${INK_300};}
.ogr-panel{background:${p.panel};border:1px solid rgba(255,255,255,.07);border-radius:22px;padding:30px 30px 26px;box-shadow:0 30px 80px rgba(0,0,0,.6);}
.ogr-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${p.accent};margin-bottom:7px;}
.ogr-title{font-size:25px;font-weight:800;letter-spacing:-.03em;color:#fff;margin:0;}
.ogr-sub{font-size:13px;color:${INK_300};margin-top:5px;margin-bottom:22px;}
.ogr-roles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px;}
.ogr-role{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 13px;border:1px solid ${GRAY_200};border-radius:12px;background:#fff;cursor:pointer;font-family:inherit;box-shadow:0 1px 2px rgba(11,26,47,.04);transition:.16s cubic-bezier(.3,.7,.3,1);}
.ogr-role:hover{border-color:${p.accent};background:${p.accentSoft};box-shadow:0 6px 16px rgba(11,26,47,.10);}
.ogr-ic{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ogr-ic svg{width:18px;height:18px;}
.ogr-role-text{display:flex;flex-direction:column;flex:1;min-width:0;}
.ogr-arrow{display:flex;align-items:center;color:${NAVY_300};flex-shrink:0;transition:color .16s;}
.ogr-arrow svg{width:16px;height:16px;}
.ogr-role:hover .ogr-arrow{color:${p.accent};}
/* Botón de voluntario: 6a celda del grid. Comparte la geometría de la
   tarjeta (incluido .ogr-ic, que le fija el alto) pero va en sólido para
   que se lea como un acceso aparte. */
.ogr-vol{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 13px;border:1px solid ${p.accent};border-radius:12px;background:${p.accent};color:#fff;cursor:pointer;font-family:inherit;text-decoration:none;box-shadow:0 1px 2px rgba(11,26,47,.04);transition:.16s cubic-bezier(.3,.7,.3,1);}
.ogr-vol:hover{background:${p.accentHover};border-color:${p.accentHover};box-shadow:0 6px 16px rgba(11,26,47,.10);}
.ogr-vol-text{flex:1;min-width:0;font-size:13.5px;font-weight:600;letter-spacing:-.01em;color:#fff;}
.ogr-vol .ogr-arrow{color:#fff;}
.ogr-name{font-size:13.5px;font-weight:600;letter-spacing:-.01em;color:${NAVY_900};}
.ogr-desc{font-size:11px;color:${GRAY_500};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ogr-foot{margin-top:22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
.ogr-foot-note{font-size:11.5px;color:${INK_300};}
.ogr-copyright{text-align:center;margin-top:24px;font-size:11.5px;color:${INK_300};opacity:.7;}
@media(max-width:900px){.ogr-roles{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.ogr-roles{grid-template-columns:1fr;}.ogr-panel{padding:24px 22px;}}
`;

function saludoFecha() {
  const d = new Date();
  const h = d.getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${saludo} · ${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
}

// NOTA: el componente conserva el nombre *GdlScreen aunque ahora también lo usa
// Mérida; no se renombra para no tocar imports/rutas (se decidió posponer).
export default function RolesGdlScreen({ roles = [], onSelect, campus = 'gdl' }) {
  const eyebrow = useMemo(saludoFecha, []);
  const p = paletaLogin(campus);
  const CSS = useMemo(() => cssFor(p), [campus]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="ogr-root">
      <style>{CSS}</style>
      <div className="ogr-glow-tr" />
      <div className="ogr-glow-bl" />
      <div className="ogr-wrap">
        <div className="ogr-brand">
          <img src="/assets/origen-mark-blanco.png" alt="Origen" />
          <div className="ogr-tag">Dashboard interno · Campus {p.nombre}</div>
        </div>
        <div className="ogr-panel">
          <div className="ogr-eyebrow">{eyebrow}</div>
          <h1 className="ogr-title">Selecciona tu rol</h1>
          <div className="ogr-sub">Entra al área que te corresponde para continuar.</div>
          <div className="ogr-roles">
            {roles.map((r) => {
              const st = ROLE_STYLE[r.id] || { name: r.label || r.nombre || r.id, desc: '' };
              // El ícono y sus colores vienen de la misma config de roles que
              // usa ags (ROLES_LIST, que LoginPage pasa por props).
              const Ic = r.icon;
              return (
                <button key={r.id} type="button" className="ogr-role" onClick={() => onSelect && onSelect(r)}>
                  {Ic ? (
                    <span className="ogr-ic" style={{ background: r.icBg, color: r.icColor }}>
                      <Ic />
                    </span>
                  ) : null}
                  <span className="ogr-role-text">
                    <span className="ogr-name">{st.name}</span>
                    {st.desc ? <span className="ogr-desc">{st.desc}</span> : null}
                  </span>
                  <span className="ogr-arrow">{Arrow}</span>
                </button>
              );
            })}

            {/* 6a celda: acceso de voluntarios, cierra la cuadrícula */}
            <Link to="/voluntario/login" className="ogr-vol">
              <span className="ogr-ic">{VolunteerIcon}</span>
              <span className="ogr-vol-text">Soy voluntario</span>
              <span className="ogr-arrow">{Arrow}</span>
            </Link>
          </div>
          <div className="ogr-foot">
            <span className="ogr-foot-note">¿No ves tu rol? Pídele acceso al administrador.</span>
          </div>
        </div>
        <div className="ogr-copyright">Dashboard interno · Origen Campus {p.nombre}</div>
      </div>
    </div>
  );
}
