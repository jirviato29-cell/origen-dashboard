import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { paletaLogin } from '../theme/loginCampus';

// Selector de rol ÚNICO para los 3 campus (Ags, Gdl, Mérida). Mismo diseño
// —tarjetas OSCURAS, panel compacto, nombre CENTRADO— y solo cambia el color,
// que sale de paletaLogin(campus). Sustituye a RolesGdlScreen/RolesMeridaScreen.

// ── Íconos (geometría de la opción 3 de Mérida) ────────────────────────────
const IconStar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21.5 7.1 18.2l.9-5.5-4-3.9L9.5 8z" strokeLinejoin="round" /></svg>
);
const IconWallet = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7a2 2 0 0 1 2-2h13l3 4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 9h18" /></svg>
);
const IconLeader = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.6" /></svg>
);
const IconPin = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
);
const IconHosts = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="9" r="3.2" /><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" strokeLinecap="round" /><circle cx="17" cy="10" r="2.5" /></svg>
);
const IconVolunteer = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="10" cy="8" r="3.4" /><path d="M3.5 20c0-3.6 2.9-6.2 6.5-6.2 1.5 0 2.9.4 4 1.2" strokeLinecap="round" /><path d="M18 15v5M15.5 17.5h5" strokeLinecap="round" /></svg>
);

const ROLE_META = {
  pastor:           { name: 'Pastor',              desc: 'Vista completa',      icon: IconStar },
  stewardship:      { name: 'Stewardship',         desc: 'Ofrendas y finanzas', icon: IconWallet },
  lider_ministerio: { name: 'Líder de Ministerio', desc: 'Tu equipo',           icon: IconLeader },
  punto_encuentro:  { name: 'Punto de Encuentro',  desc: 'Eventos',             icon: IconPin },
  anfitriones:      { name: 'Anfitriones',         desc: 'Asistencia',          icon: IconHosts, coral: true },
};

// Logo del encabezado: Mérida usa su lockup "origen Mérida"; el resto la marca.
const LOGO = { mid: '/assets/origen-merida-white.png' };

// CSS parametrizado por la paleta del campus (p). Tarjetas centradas (ícono
// arriba, nombre y descripción debajo, todo centrado).
const cssFor = (p) => `
.rs-root{background:${p.bg};min-height:100vh;display:flex;align-items:center;justify-content:center;padding:44px 24px 40px;position:relative;overflow:hidden;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;}
.rs-glow-tr{position:absolute;top:-160px;right:-120px;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,${p.glowTr},transparent 68%);pointer-events:none;}
.rs-glow-bl{position:absolute;bottom:-200px;left:-150px;width:540px;height:540px;border-radius:50%;background:radial-gradient(circle,${p.glowBl},transparent 70%);pointer-events:none;}
.rs-wrap{width:100%;max-width:620px;position:relative;z-index:1;}
.rs-brand{text-align:center;margin-bottom:26px;}
.rs-brand img{width:150px;height:auto;display:block;margin:0 auto;}
.rs-tag{margin-top:12px;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${p.textSub};}
.rs-panel{background:${p.panel};border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:26px 26px 22px;box-shadow:0 26px 70px rgba(0,0,0,.5);}
.rs-eye{font-size:10.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:${p.accent};margin-bottom:7px;}
.rs-ttl{font-size:23px;font-weight:800;letter-spacing:-.03em;color:#fff;margin:0;}
.rs-sub{font-size:13px;margin-top:5px;color:${p.textSub};}
.rs-roles{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:20px;}
.rs-role{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;gap:9px;padding:18px 12px 16px;border-radius:13px;border:1px solid ${p.cardBorder};background:${p.card};cursor:pointer;position:relative;overflow:hidden;transition:.15s;font-family:inherit;width:100%;text-decoration:none;}
.rs-role::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;transform:scaleX(0);transform-origin:left;transition:transform .2s;background:${p.accent};}
.rs-role:hover::after{transform:scaleX(1);}
.rs-role:hover{transform:translateY(-2px);background:${p.cardHover};border-color:${p.cardBorderHover};}
.rs-ic{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(255,255,255,.09);color:#fff;}
.rs-ic svg{width:20px;height:20px;}
.rs-ic.rs-coral{background:${p.anfitrionTile};color:${p.anfitrionInk};}
.rs-tx{display:flex;flex-direction:column;gap:3px;}
.rs-name{font-size:13.5px;font-weight:800;letter-spacing:-.015em;line-height:1.2;color:#fff;}
.rs-desc{font-size:11px;line-height:1.3;color:${p.textSub};}
/* Voluntario: tarjeta completa en el 2º color. .rs-role.rs-vol tras :hover para
   que conserve su color también en hover. */
.rs-role.rs-vol{background:${p.volBg};border-color:${p.volBg};}
.rs-vol .rs-name{color:${p.volInk};}
.rs-vol .rs-desc{color:${p.volSubInk};}
.rs-vol .rs-ic{background:rgba(0,0,0,.14);color:${p.volInk};}
.rs-foot{font-size:11.5px;margin-top:18px;color:${p.textSub};}
.rs-copy{text-align:center;margin-top:20px;font-size:11px;color:${p.textFaint};}
@media(max-width:860px){.rs-roles{grid-template-columns:1fr 1fr;}}
@media(max-width:560px){.rs-roles{grid-template-columns:1fr;}}
`;

const DIAS  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function saludoFecha() {
  const d = new Date();
  const h = d.getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `${saludo} · ${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// `roles` llega desde LoginPage (ROLES_LIST); se recorre para respetar orden y
// control de acceso ("muestra solo los roles con acceso").
export default function RolesScreen({ roles = [], onSelect, campus = 'ags' }) {
  const eyebrow = useMemo(() => saludoFecha(), []);
  const p = paletaLogin(campus);
  const CSS = useMemo(() => cssFor(p), [campus]); // eslint-disable-line react-hooks/exhaustive-deps
  const logo = LOGO[campus] || '/assets/origen-mark-blanco.png';
  return (
    <div className="rs-root">
      <style>{CSS}</style>
      <div className="rs-glow-tr" />
      <div className="rs-glow-bl" />
      <div className="rs-wrap">
        <div className="rs-brand">
          <img src={logo} alt={`Origen ${p.nombre}`} />
          <div className="rs-tag">Dashboard interno · Campus {p.nombre}</div>
        </div>
        <div className="rs-panel">
          <div className="rs-eye">{eyebrow}</div>
          <h1 className="rs-ttl">Selecciona tu rol</h1>
          <div className="rs-sub">Entra al área que te corresponde para continuar.</div>
          <div className="rs-roles">
            {roles.map((r) => {
              const m = ROLE_META[r.id] || { name: r.label || r.nombre || r.id, desc: r.desc || '', icon: null };
              return (
                <button key={r.id} type="button" className="rs-role" onClick={() => onSelect && onSelect(r)}>
                  <span className={`rs-ic${m.coral ? ' rs-coral' : ''}`}>{m.icon}</span>
                  <span className="rs-tx">
                    <span className="rs-name">{m.name}</span>
                    {m.desc ? <span className="rs-desc">{m.desc}</span> : null}
                  </span>
                </button>
              );
            })}

            {/* 6a celda: acceso de voluntarios, tarjeta completa en el 2º color */}
            <Link to="/voluntario/login" className="rs-role rs-vol">
              <span className="rs-ic">{IconVolunteer}</span>
              <span className="rs-tx">
                <span className="rs-name">Soy voluntario</span>
                <span className="rs-desc">Mi calendario</span>
              </span>
            </Link>
          </div>
          <div className="rs-foot">¿No ves tu rol? Pídele acceso al administrador.</div>
        </div>
        <div className="rs-copy">Dashboard interno · Origen Campus {p.nombre}</div>
      </div>
    </div>
  );
}
