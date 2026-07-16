import { useMemo } from 'react';
import { Link } from 'react-router-dom';

const MINT = '#2DD4BF';
const INK_300 = '#9A9A9A';

const Icon = {
  pastor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21.5 7.1 18.2l.9-5.5-4-3.9L9.5 8z" strokeLinejoin="round" /></svg>
  ),
  stewardship: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7a2 2 0 0 1 2-2h13l3 4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 9h18" /></svg>
  ),
  anfitriones: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="9" r="3.2" /><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" strokeLinecap="round" /><circle cx="17" cy="10" r="2.5" /></svg>
  ),
  punto_encuentro: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
  ),
  lider_ministerio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="7" r="3.2" /><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" /><path d="M4.5 12.5a2.2 2.2 0 1 0 0-4.4M19.5 12.5a2.2 2.2 0 1 1 0-4.4" strokeLinecap="round" /></svg>
  ),
};
const IconDefault = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /></svg>
);
const Arrow = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const ROLE_STYLE = {
  pastor:          { name:'Pastor',             desc:'Vista completa del dashboard',        icBg:'#fff',                  icColor:'#111',    dot:'#fff',    meta:'Acceso de solo lectura' },
  stewardship:     { name:'Stewardship',        desc:'Ofrendas, finanzas y administración', icBg:'rgba(255,255,255,.1)', icColor:'#fff',    dot:INK_300,   meta:'Ingresos · Gastos · Balance' },
  anfitriones:     { name:'Anfitriones',        desc:'Gestión de asistencia y bienvenida',  icBg:'rgba(45,212,191,.18)', icColor:MINT,      dot:MINT,      meta:'Asistencia · Bienvenida' },
  punto_encuentro: { name:'Punto de Encuentro', desc:'Registro y seguimiento de eventos',   icBg:'rgba(92,122,111,.22)', icColor:'#8FB5A6', dot:'#5C7A6F', meta:'Eventos · Participantes' },
  lider_ministerio:{ name:'Líder de Ministerio', desc:'Tu equipo de voluntarios',           icBg:'rgba(255,255,255,.1)', icColor:'#fff',    dot:INK_300,   meta:'Voluntarios · Posiciones' },
};

const CSS = `
.ogr-root{background:#0A0A0A;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;position:relative;overflow:hidden;color:#fff;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;}
.ogr-glow-tr{position:absolute;top:-180px;right:-140px;width:540px;height:540px;border-radius:50%;background:radial-gradient(circle,rgba(45,212,191,.12),transparent 68%);pointer-events:none;}
.ogr-glow-bl{position:absolute;bottom:-220px;left:-160px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.05),transparent 70%);pointer-events:none;}
.ogr-wrap{width:100%;max-width:680px;position:relative;z-index:1;}
.ogr-brand{text-align:center;margin-bottom:34px;}
.ogr-brand img{width:172px;height:auto;display:block;margin-left:auto;margin-right:auto;}
.ogr-tag{margin-top:14px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${INK_300};}
.ogr-panel{background:#16161A;border:1px solid rgba(255,255,255,.07);border-radius:22px;padding:30px 30px 26px;box-shadow:0 30px 80px rgba(0,0,0,.6);}
.ogr-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${MINT};margin-bottom:7px;}
.ogr-title{font-size:25px;font-weight:800;letter-spacing:-.03em;color:#fff;margin:0;}
.ogr-sub{font-size:13px;color:${INK_300};margin-top:5px;margin-bottom:22px;}
.ogr-roles{display:grid;grid-template-columns:1fr 1fr;gap:13px;}
.ogr-role{display:flex;flex-direction:column;text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:18px;background:#1E1E22;cursor:pointer;position:relative;overflow:hidden;transition:.16s cubic-bezier(.3,.7,.3,1);color:#fff;font-family:inherit;}
.ogr-role::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:${MINT};transform:scaleX(0);transform-origin:left;transition:transform .2s;}
.ogr-role:hover{border-color:rgba(255,255,255,.18);background:#26262B;box-shadow:0 12px 30px rgba(0,0,0,.4);transform:translateY(-3px);}
.ogr-role:hover::after{transform:scaleX(1);}
.ogr-role-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.ogr-ic{width:46px;height:46px;min-width:46px;max-width:46px;min-height:46px;max-height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ogr-ic svg{width:23px;height:23px;}
.ogr-arrow{width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;color:${INK_300};transition:.16s;flex-shrink:0;}
.ogr-role:hover .ogr-arrow{background:${MINT};border-color:${MINT};color:#0A0A0A;}
.ogr-arrow svg{width:16px;height:16px;}
.ogr-name{font-size:16px;font-weight:800;letter-spacing:-.02em;color:#fff;}
.ogr-desc{font-size:12.5px;color:${INK_300};margin-top:3px;line-height:1.4;}
.ogr-meta{margin-top:13px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);font-size:11px;font-weight:600;color:${INK_300};display:flex;align-items:center;gap:6px;}
.ogr-mdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.ogr-foot{margin-top:22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
.ogr-foot-note{font-size:11.5px;color:${INK_300};}
.ogr-vol{font-size:12px;font-weight:600;color:${INK_300};text-decoration:none;transition:color .15s;}
.ogr-vol:hover{color:#fff;}
.ogr-copyright{text-align:center;margin-top:24px;font-size:11.5px;color:${INK_300};opacity:.7;}
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

export default function RolesGdlScreen({ roles = [], onSelect }) {
  const eyebrow = useMemo(saludoFecha, []);
  return (
    <div className="ogr-root">
      <style>{CSS}</style>
      <div className="ogr-glow-tr" />
      <div className="ogr-glow-bl" />
      <div className="ogr-wrap">
        <div className="ogr-brand">
          <img src="/assets/origen-mark-blanco.png" alt="Origen" />
          <div className="ogr-tag">Dashboard interno · Campus Guadalajara</div>
        </div>
        <div className="ogr-panel">
          <div className="ogr-eyebrow">{eyebrow}</div>
          <h1 className="ogr-title">Selecciona tu rol</h1>
          <div className="ogr-sub">Entra al área que te corresponde para continuar.</div>
          <div className="ogr-roles">
            {roles.map((r) => {
              const st = ROLE_STYLE[r.id] || { name: r.label || r.nombre || r.id, desc: '', icBg:'rgba(255,255,255,.1)', icColor:'#fff', dot:INK_300, meta:'' };
              return (
                <button key={r.id} className="ogr-role" onClick={() => onSelect && onSelect(r)}>
                  <div className="ogr-role-top">
                    <div className="ogr-ic" style={{ background: st.icBg, color: st.icColor }}>{Icon[r.id] || IconDefault}</div>
                    <div className="ogr-arrow">{Arrow}</div>
                  </div>
                  <div className="ogr-name">{st.name}</div>
                  {st.desc ? <div className="ogr-desc">{st.desc}</div> : null}
                  {st.meta ? (
                    <div className="ogr-meta"><span className="ogr-mdot" style={{ background: st.dot }} />{st.meta}</div>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="ogr-foot">
            <span className="ogr-foot-note">¿No ves tu rol? Pídele acceso al administrador.</span>
            <Link to="/voluntario/login" className="ogr-vol">Soy voluntario →</Link>
          </div>
        </div>
        <div className="ogr-copyright">Dashboard interno · Origen Campus Guadalajara</div>
      </div>
    </div>
  );
}
