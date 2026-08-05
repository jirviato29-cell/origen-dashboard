import { useMemo } from 'react';
import { Link } from 'react-router-dom';

// Pantalla "Selecciona tu rol" del CAMPUS MÉRIDA — identidad TURQUESA CARIBE + CORAL.
// Implementa EXACTAMENTE la opción 3 del HTML de referencia (ver
// SPEC-Selector-Rol-Merida.md). Es un diseño propio de Mérida (tarjetas OSCURAS
// turquesa), distinto del de Gdl/Ags (tarjetas blancas de RolesGdlScreen), por
// eso vive en su propio componente en vez de parametrizar el compartido.
//
// Paleta (hex exactos de la opción 3):
//   fondo #062A31 · panel #0A3A43 · tarjeta #0F4B56 (hover #145E6B)
//   coral #FF9A5E (eyebrow + borde inferior en hover) · turquesa #2FB5A8 (voluntario)

// ── Íconos (geometría exacta de la opción 3) ───────────────────────────────
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
const Arrow = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// Meta por rol: nombre, descripción corta e ícono (opción 3). `coral` marca la
// tile de ícono en coral (Anfitriones). Se busca por el id del rol que llega en
// props (mismos ids que ROLES: pastor, stewardship, …).
const ROLE_META = {
  pastor:           { name: 'Pastor',              desc: 'Vista completa',      icon: IconStar },
  stewardship:      { name: 'Stewardship',         desc: 'Ofrendas y finanzas', icon: IconWallet },
  lider_ministerio: { name: 'Líder de Ministerio', desc: 'Tu equipo',           icon: IconLeader },
  punto_encuentro:  { name: 'Punto de Encuentro',  desc: 'Eventos',             icon: IconPin },
  anfitriones:      { name: 'Anfitriones',         desc: 'Asistencia',          icon: IconHosts, coral: true },
};

// CSS de la opción 3 (prefijo omr- = origen-mérida-roles). Colores fijos: es la
// identidad de Mérida, no se re-tematiza por campus.
const CSS = `
.omr-root{background:#062A31;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:44px 24px 40px;position:relative;overflow:hidden;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;}
.omr-glow-tr{position:absolute;top:-160px;right:-120px;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,rgba(255,138,82,.13),transparent 68%);pointer-events:none;}
.omr-glow-bl{position:absolute;bottom:-200px;left:-150px;width:540px;height:540px;border-radius:50%;background:radial-gradient(circle,rgba(42,157,166,.32),transparent 70%);pointer-events:none;}
.omr-wrap{width:100%;max-width:620px;position:relative;z-index:1;}
.omr-brand{text-align:center;margin-bottom:26px;}
.omr-brand img{width:150px;height:auto;display:block;margin:0 auto;}
.omr-tag{margin-top:12px;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#8FC2C8;}
.omr-panel{background:#0A3A43;border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:26px 26px 22px;box-shadow:0 26px 70px rgba(0,0,0,.5);}
.omr-eye{font-size:10.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#FF9A5E;margin-bottom:7px;}
.omr-ttl{font-size:23px;font-weight:800;letter-spacing:-.03em;color:#fff;margin:0;}
.omr-sub{font-size:13px;margin-top:5px;color:#8FC2C8;}
.omr-roles{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:20px;}
.omr-role{border-radius:13px;padding:13px;display:flex;align-items:center;gap:11px;cursor:pointer;transition:.15s;position:relative;overflow:hidden;text-align:left;border:1px solid rgba(255,255,255,.08);background:#0F4B56;font-family:inherit;width:100%;}
.omr-role::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;transform:scaleX(0);transform-origin:left;transition:transform .2s;background:#FF9A5E;}
.omr-role:hover::after{transform:scaleX(1);}
.omr-role:hover{transform:translateY(-2px);background:#145E6B;border-color:rgba(255,255,255,.16);}
.omr-rc{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(255,255,255,.09);color:#fff;}
.omr-rc svg{width:17px;height:17px;}
.omr-rc.omr-coral{background:rgba(255,154,94,.2);color:#FFB183;}
.omr-rb{min-width:0;flex:1;}
/* rn/rd en block: evita el bug "PastorVista completa" (nombre y descripción
   pegados en una línea). Cada uno en su propio renglón. */
.omr-rn{display:block;font-size:13.5px;font-weight:800;letter-spacing:-.015em;line-height:1.2;color:#fff;}
.omr-rd{display:block;font-size:11px;margin-top:3px;line-height:1.3;color:#8FC2C8;}
.omr-arw{flex-shrink:0;opacity:.5;color:#8FC2C8;display:flex;align-items:center;}
.omr-arw svg{width:14px;height:14px;}
/* Voluntario: tarjeta completa en turquesa. .omr-role.omr-vol (misma
   especificidad que :hover y declarada después) para que conserve el turquesa
   también en hover, igual que la referencia. */
.omr-role.omr-vol{background:#2FB5A8;border-color:#2FB5A8;text-decoration:none;}
.omr-vol .omr-rn{color:#052A2A;}
.omr-vol .omr-rd{color:rgba(5,42,42,.72);}
.omr-vol .omr-arw{color:#052A2A;}
.omr-vol .omr-rc{background:rgba(5,42,42,.16);color:#052A2A;}
.omr-foot{font-size:11.5px;margin-top:18px;color:#8FC2C8;}
.omr-copy{text-align:center;margin-top:20px;font-size:11px;color:#6FA3AA;}
@media(max-width:860px){.omr-roles{grid-template-columns:1fr 1fr;}}
@media(max-width:560px){.omr-roles{grid-template-columns:1fr;}}
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
// control de acceso ("muestra solo los roles con acceso"). `campus` se acepta
// por paridad con RolesGdlScreen aunque aquí la paleta es fija (Mérida).
export default function RolesMeridaScreen({ roles = [], onSelect }) {
  const eyebrow = useMemo(() => saludoFecha(), []);
  return (
    <div className="omr-root">
      <style>{CSS}</style>
      <div className="omr-glow-tr" />
      <div className="omr-glow-bl" />
      <div className="omr-wrap">
        <div className="omr-brand">
          <img src="/assets/origen-mark-blanco.png" alt="Origen Mérida" />
          <div className="omr-tag">Dashboard interno · Campus Mérida</div>
        </div>
        <div className="omr-panel">
          <div className="omr-eye">{eyebrow}</div>
          <h1 className="omr-ttl">Selecciona tu rol</h1>
          <div className="omr-sub">Entra al área que te corresponde para continuar.</div>
          <div className="omr-roles">
            {roles.map((r) => {
              const m = ROLE_META[r.id] || { name: r.label || r.nombre || r.id, desc: r.desc || '', icon: null };
              return (
                <button key={r.id} type="button" className="omr-role" onClick={() => onSelect && onSelect(r)}>
                  <span className={`omr-rc${m.coral ? ' omr-coral' : ''}`}>{m.icon}</span>
                  <span className="omr-rb">
                    <span className="omr-rn">{m.name}</span>
                    {m.desc ? <span className="omr-rd">{m.desc}</span> : null}
                  </span>
                  <span className="omr-arw">{Arrow}</span>
                </button>
              );
            })}

            {/* 6a celda: acceso de voluntarios, tarjeta completa en turquesa */}
            <Link to="/voluntario/login" className="omr-role omr-vol">
              <span className="omr-rc">{IconVolunteer}</span>
              <span className="omr-rb">
                <span className="omr-rn">Soy voluntario</span>
                <span className="omr-rd">Mi calendario</span>
              </span>
              <span className="omr-arw">{Arrow}</span>
            </Link>
          </div>
          <div className="omr-foot">¿No ves tu rol? Pídele acceso al administrador.</div>
        </div>
        <div className="omr-copy">Dashboard interno · Origen Campus Mérida</div>
      </div>
    </div>
  );
}
