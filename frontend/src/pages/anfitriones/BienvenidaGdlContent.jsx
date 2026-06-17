const MINT='#0E9E8C', MINT_SOFT='rgba(14,158,140,.12)', CORAL='#D2674A', CORAL_SOFT='rgba(210,103,74,.16)', CORAL_TXT='#B0502F';
const INK='#16161A', INK3='#7C7C7C', INK5='#9A9A9A', BORDER='#E4E4E4', SURF='#FFFFFF', SURF2='#FAFAFA', SURF3='#F0F0F0';

const VISITAS = [
  { n:1, fecha:'01 feb 2026', rel:'seguir', nombre:'Diana Robles', ini:'DR', edad:'29 años', fe:'nuevo', wa:'33 1204 7781', fuente:'Redes sociales', acomp:'Iván Robledo', colonia:'Providencia' },
  { n:2, fecha:'01 mar 2026', rel:'seguir', nombre:'Julia López', ini:'JL', edad:'35 años', fe:'nuevo', wa:'33 1845 2290', fuente:'Por invitación de Memo', acomp:'Karina Salas (33) y Diego (7)', colonia:'Zapopan' },
  { n:3, fecha:'08 feb 2026', rel:'seguir', nombre:'Mario Ortega', ini:'MO', edad:'27 años', fe:'cristiano', wa:'33 2298 5512', fuente:'Redes sociales', acomp:'Pablo Sandoval (pareja)', colonia:'Chapalita' },
  { n:4, fecha:'08 feb 2026', rel:'seguir', nombre:'—', ini:'RT', edad:'—', fe:'cristiano', wa:'33 1190 7745', fuente:'Redes sociales', acomp:'', colonia:'' },
  { n:5, fecha:'08 feb 2026', rel:'visita', nombre:'Lucía Castro', ini:'LC', edad:'54 años', fe:'cristiano', wa:'33 1567 0098', fuente:'Por medio de Ana Laura', acomp:'', colonia:'Tlaquepaque' },
  { n:6, fecha:'15 feb 2026', rel:'visita', nombre:'Sofía Quiroz', ini:'SQ', edad:'41 años', fe:'nuevo', wa:'33 2901 4471', fuente:'Por medio de Belén', acomp:'Janet Gallardo (38)', colonia:'Las Águilas' },
  { n:7, fecha:'15 feb 2026', rel:'sindef', nombre:'Pedro Ayala', ini:'PA', edad:'19 años', fe:'nuevo', wa:'33 3340 1182', fuente:'Invitación de amigos', acomp:'', colonia:'Tonalá' },
  { n:8, fecha:'22 feb 2026', rel:'seguir', nombre:'Elena Vargas', ini:'EV', edad:'24 años', fe:'nuevo', wa:'33 1820 6634', fuente:'Por medio de Memo Ríos', acomp:'Fernanda Lozano (23)', colonia:'Americana' },
];

const WaIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z"/><path d="M8.5 9.5c0 3 2 5 5 5l1.2-.8-1.2-1.5-1.3.6c-1-.5-1.8-1.3-2.3-2.3l.6-1.3-1.5-1.2z" fill="currentColor" stroke="none"/></svg>;
const EditIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20h4L18 10l-4-4L4 16z"/></svg>;

const REL = {
  seguir: { cls:'bgc-rel-seguir', txt:'Me interesa seguir' },
  visita: { cls:'bgc-rel-visita', txt:'Solo vengo de visita' },
  sindef: { cls:'bgc-rel-visita', txt:'Sin definir' },
};

const CSS = `
.bgc-wrap{display:flex;flex-direction:column;gap:14px;font-family:"DM Sans",-apple-system,system-ui,sans-serif;color:${INK};}
.bgc-welcome{background:linear-gradient(135deg,#14141A,#0C0C0E);border:1px solid ${BORDER};border-radius:16px;padding:22px 26px;color:#fff;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:20px;}
.bgc-welcome::after{content:"";position:absolute;right:-30px;top:50%;transform:translateY(-50%);width:220px;height:220px;border-radius:50%;border:1px solid rgba(14,158,140,.18);}
.bgc-welcome::before{content:"";position:absolute;right:40px;top:50%;transform:translateY(-50%);width:150px;height:150px;border-radius:50%;border:1px solid rgba(210,103,74,.18);}
.bgc-w-txt{position:relative;z-index:1;}
.bgc-w-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${MINT};margin-bottom:8px;}
.bgc-w-h{font-size:24px;font-weight:800;letter-spacing:-.03em;margin:0 0 6px;color:#fff;}
.bgc-w-p{font-size:13px;color:#C2C2C2;margin:0;}
.bgc-w-cta{position:relative;z-index:1;}
.bgc-btn{display:inline-flex;align-items:center;gap:7px;font-family:inherit;font-size:13px;font-weight:700;padding:11px 18px;border-radius:10px;border:0;cursor:pointer;background:${MINT};color:#06231F;}
.bgc-btn:hover{background:#0B8A7A;}
.bgc-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.bgc-kpi{background:${SURF};border:1px solid ${BORDER};border-radius:14px;padding:16px 18px;}
.bgc-kpi-label{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:${INK3};margin-bottom:9px;}
.bgc-kpi-val{font-size:28px;font-weight:800;letter-spacing:-.04em;line-height:1;color:${INK};font-variant-numeric:tabular-nums;}
.bgc-kpi-val.coral{color:${CORAL};}
.bgc-kpi-val.mint{color:${MINT};}
.bgc-kpi-foot{margin-top:9px;font-size:11.5px;color:${INK3};}
.bgc-card{background:${SURF};border:1px solid ${BORDER};border-radius:16px;padding:18px 20px;}
.bgc-card-sub{font-size:13px;color:${INK3};margin:0 0 16px;}
.bgc-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.bgc-search{flex:1;min-width:220px;}
.bgc-search input{width:100%;padding:10px 12px;border:1px solid ${BORDER};border-radius:9px;background:${SURF2};color:${INK};font:inherit;font-size:13.5px;}
.bgc-search input:focus{outline:2px solid ${MINT};outline-offset:-1px;}
.bgc-search input::placeholder{color:${INK5};}
.bgc-chip{font-size:12.5px;font-weight:600;padding:8px 13px;border-radius:8px;border:1px solid ${BORDER};background:${SURF2};color:${INK3};cursor:pointer;}
.bgc-chip:hover{background:${SURF3};color:${INK};}
.bgc-chip.active{background:${MINT};color:#06231F;border-color:${MINT};}
.bgc-tbl-shell{border:1px solid ${BORDER};border-radius:10px;overflow:auto;}
.bgc-tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:13px;min-width:1080px;}
.bgc-tbl th{text-align:left;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:${INK3};font-weight:700;padding:12px 14px;background:${SURF2};border-bottom:1px solid ${BORDER};white-space:nowrap;position:sticky;top:0;}
.bgc-tbl td{padding:12px 14px;border-bottom:1px solid ${BORDER};color:${INK};vertical-align:middle;}
.bgc-tbl tbody tr:last-child td{border-bottom:0;}
.bgc-tbl tbody tr:hover td{background:${SURF2};}
.bgc-num{color:${INK3};font-weight:700;font-variant-numeric:tabular-nums;width:34px;}
.bgc-fecha{color:${INK3};font-size:12px;white-space:nowrap;}
.bgc-person{display:flex;align-items:center;gap:10px;}
.bgc-av{width:32px;height:32px;border-radius:50%;background:${SURF3};color:${INK};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0;}
.bgc-av.coral{background:${CORAL};color:#fff;}
.bgc-name{font-weight:700;color:${INK};font-size:13px;white-space:nowrap;}
.bgc-edad{font-size:11px;color:${INK3};}
.bgc-rel{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:999px;white-space:nowrap;}
.bgc-rel-seguir{background:${CORAL_SOFT};color:${CORAL_TXT};}
.bgc-rel-visita{background:${SURF3};color:${INK3};}
.bgc-rel .d{width:6px;height:6px;border-radius:50%;background:currentColor;}
.bgc-fe{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:6px;white-space:nowrap;}
.bgc-fe.nuevo{background:${MINT_SOFT};color:${MINT};}
.bgc-fe.cristiano{background:${SURF3};color:${INK3};}
.bgc-wa{font-family:"JetBrains Mono",monospace;font-size:12px;color:${INK3};display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}
.bgc-wa svg{width:14px;height:14px;color:${MINT};flex-shrink:0;}
.bgc-empty{color:#C2C2C2;}
.bgc-acts{white-space:nowrap;text-align:right;}
.bgc-mini{width:30px;height:30px;border-radius:7px;border:1px solid ${BORDER};background:${SURF2};color:${INK3};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin-left:5px;}
.bgc-mini svg{width:15px;height:15px;}
.bgc-mini:hover{color:${INK};background:${SURF3};}
.bgc-mini.wa:hover{color:${MINT};background:${MINT_SOFT};border-color:transparent;}
@media(max-width:1180px){.bgc-kpis{grid-template-columns:repeat(2,1fr);}}
`;

export default function BienvenidaGdlContent() {
  return (
    <div className="bgc-wrap">
      <style>{CSS}</style>

      <div className="bgc-welcome">
        <div className="bgc-w-txt">
          <div className="bgc-w-eyebrow">Registro de visitantes · Origen Guadalajara</div>
          <h2 className="bgc-w-h">28 personas nos visitaron este periodo</h2>
          <p className="bgc-w-p">17 quieren seguir asistiendo · dales seguimiento esta semana</p>
        </div>
        <div className="bgc-w-cta"><button className="bgc-btn">+ Registrar visita</button></div>
      </div>

      <div className="bgc-kpis">
        <div className="bgc-kpi"><div className="bgc-kpi-label">Visitantes</div><div className="bgc-kpi-val">28</div><div className="bgc-kpi-foot">registrados · feb–mar 2026</div></div>
        <div className="bgc-kpi"><div className="bgc-kpi-label">Quieren seguir</div><div className="bgc-kpi-val coral">17</div><div className="bgc-kpi-foot">dar seguimiento</div></div>
        <div className="bgc-kpi"><div className="bgc-kpi-label">Nuevos en la fe</div><div className="bgc-kpi-val mint">15</div><div className="bgc-kpi-foot">ya son cristianos</div></div>
        <div className="bgc-kpi"><div className="bgc-kpi-label">Marzo 2026</div><div className="bgc-kpi-val">16</div><div className="bgc-kpi-foot">visitas este mes</div></div>
      </div>

      <div className="bgc-card">
        <p className="bgc-card-sub">28 personas · Origen Guadalajara</p>
        <div className="bgc-toolbar">
          <div className="bgc-search"><input placeholder="Buscar por nombre, colonia o quién lo invitó…" /></div>
          <button className="bgc-chip active">Todos</button>
          <button className="bgc-chip">Quieren seguir</button>
          <button className="bgc-chip">Solo visita</button>
          <button className="bgc-chip">Nuevos en la fe</button>
        </div>
        <div className="bgc-tbl-shell">
          <table className="bgc-tbl">
            <thead><tr>
              <th>N°</th><th>Fecha</th><th>Relación con Origen</th><th>Nombre</th><th>Estado de fe</th><th>WhatsApp</th><th>¿Cómo se enteró?</th><th>Acompañantes</th><th>Colonia</th><th></th>
            </tr></thead>
            <tbody>
              {VISITAS.map((v) => (
                <tr key={v.n}>
                  <td className="bgc-num">{v.n}</td>
                  <td className="bgc-fecha">{v.fecha}</td>
                  <td><span className={`bgc-rel ${REL[v.rel].cls}`}><span className="d" />{REL[v.rel].txt}</span></td>
                  <td><div className="bgc-person"><div className={`bgc-av ${v.rel==='seguir'?'coral':''}`}>{v.ini}</div><div><div className="bgc-name">{v.nombre}</div><div className="bgc-edad">{v.edad}</div></div></div></td>
                  <td><span className={`bgc-fe ${v.fe}`}>{v.fe==='nuevo'?'Soy nuevo':'Soy cristiano'}</span></td>
                  <td><span className="bgc-wa">{WaIcon}{v.wa}</span></td>
                  <td>{v.fuente}</td>
                  <td className={v.acomp?'':'bgc-empty'}>{v.acomp || '—'}</td>
                  <td className={v.colonia?'':'bgc-empty'}>{v.colonia || '—'}</td>
                  <td className="bgc-acts"><button className="bgc-mini wa">{WaIcon}</button><button className="bgc-mini">{EditIcon}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
