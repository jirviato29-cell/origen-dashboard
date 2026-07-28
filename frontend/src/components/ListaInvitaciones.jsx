import { I } from './Icons';
import { claveItem } from '../hooks/useDisponibilidadMes';

// Lista de invitaciones del voluntario (sistema azul marino + naranja). Cada
// fecha es una TARJETA con barra lateral de 5px, chip de fecha y color según
// estado (ámbar = por responder · verde = sí colaboro · rojo = no podré). El
// estado nunca depende solo del color: barra + ícono + texto (adultos mayores).
// Presentacional: recibe el listado + callbacks del hook useDisponibilidadMes.

const DOW_CORTO = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const diaDeISO = (iso) => Number(iso.slice(8, 10));
const dowDeISO = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};

// Días hasta el cierre (el cambio cierra 1 día antes de la fecha).
const diasEntre = (aISO, bISO) =>
  Math.round((Date.parse(`${bISO}T00:00:00Z`) - Date.parse(`${aISO}T00:00:00Z`)) / 86400000);
const menosUnDia = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};
const textoCierre = (fecha, hoyISO) => {
  if (!hoyISO) return null;
  const n = diasEntre(hoyISO, menosUnDia(fecha));
  if (n < 0) return null;
  if (n === 0) return 'Cierra hoy';
  if (n === 1) return 'Cierra mañana';
  return `Cierra en ${n} días`;
};

const CSS = `
.inv-shell{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;color:#16233A;width:100%;}
.inv-shell *{box-sizing:border-box;}
.inv-list{display:flex;flex-direction:column;}

/* Tarjeta */
.ic{border-radius:14px;border:1px solid var(--bd);border-left:5px solid var(--bar);background:var(--bg);padding:14px 16px;margin-bottom:12px;}
.ic:last-child{margin-bottom:0;}
.ic-top{display:flex;align-items:flex-start;gap:14px;}
.ic-chip{width:54px;height:54px;border-radius:12px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ic-chip .c-dow{font-size:10.5px;font-weight:700;letter-spacing:.06em;line-height:1;}
.ic-chip .c-num{font-size:23px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums;}
.ic-main{flex:1;min-width:0;}
.ic-name{font-size:17px;font-weight:800;letter-spacing:-.01em;line-height:1.2;color:#112540;overflow-wrap:anywhere;}
.ic-meta{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:7px;}
.ic-mtag{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;padding:3px 10px;border-radius:20px;background:#DCE4EF;color:#244169;white-space:nowrap;}
.ic-mdot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.ic-close{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:700;padding:3px 10px;border-radius:20px;background:#FEF9C3;color:#8A6D0F;white-space:nowrap;}
.ic-state{display:inline-flex;align-items:center;gap:9px;font-size:15px;font-weight:700;margin-top:10px;}
.ic-scircle{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;}
.ic-right{flex-shrink:0;display:flex;align-items:center;}
.inv-shell .ic-cambiar{min-height:40px;border-radius:10px;padding:0 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;background:#fff;color:#244169;border:1px solid var(--gray-300,#CBD2DC);white-space:nowrap;}
.ic-lock{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:700;color:#7A8699;white-space:nowrap;}

/* Botones grandes (por responder) */
.ic-actions{display:flex;gap:10px;margin-top:12px;}
.inv-shell .ic-btn{flex:1;min-width:0;min-height:52px;border-radius:12px;font-size:16px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;font-family:inherit;background:#fff;border:1.5px solid #E2E6EC;transition:.12s;}
.inv-shell .ic-btn:disabled{opacity:.6;cursor:default;}
.inv-shell .ic-yes{color:#15915A;}
.inv-shell .ic-yes:hover{background:#E6F5EC;border-color:#15915A;}
.inv-shell .ic-no{color:#D23B36;}
.inv-shell .ic-no:hover{background:#FBEAE9;border-color:#D23B36;}

/* Estado vacío */
.ic-empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:34px 16px;}
.ic-empty-ic{width:64px;height:64px;border-radius:50%;border:2px dashed #CBD2DC;display:flex;align-items:center;justify-content:center;color:#9CB0CC;margin-bottom:14px;}
.ic-empty-t{font-size:16px;font-weight:700;color:#244169;}
.ic-empty-s{font-size:14px;color:#7A8699;margin-top:5px;max-width:240px;line-height:1.4;}

.inv-msg{padding:16px 2px;font-size:15px;color:#7A8699;}
.inv-err{margin:6px 0 0;padding:10px 12px;border-radius:10px;background:#FBEAE9;border:1px solid #F3CBC9;color:#D23B36;font-size:14px;font-weight:600;}
`;

// Paleta de la tarjeta por estado.
const ESTILOS = {
  pend: { bg: '#FEFCE8', bd: '#F3E4A8', bar: '#C98A14', chipBg: '#C98A14', chipDow: '#FDE9A7', chipNum: '#fff' },
  si:   { bg: '#F0FAF4', bd: '#C9EBD6', bar: '#15915A', chipBg: '#112540', chipDow: '#9CB0CC', chipNum: '#fff' },
  no:   { bg: '#FCEEED', bd: '#F3CBC9', bar: '#D23B36', chipBg: '#112540', chipDow: '#9CB0CC', chipNum: '#fff' },
  cerr: { bg: '#F6F7F9', bd: '#E2E6EC', bar: '#CBD2DC', chipBg: '#EEF1F5', chipDow: '#9CB0CC', chipNum: '#7A8699' },
};

export default function ListaInvitaciones({
  listado = [],
  marcar,
  enviando,
  editando = {},
  setEditando,
  hoyISO = '',
  ministerio = null,
  mesNombre = 'este mes',
  cargando = false,
  error = '',
}) {
  if (cargando) {
    return <div className="inv-shell"><style>{CSS}</style><div className="inv-msg">Cargando…</div></div>;
  }

  if (listado.length === 0) {
    return (
      <div className="inv-shell">
        <style>{CSS}</style>
        <div className="ic-empty">
          <div className="ic-empty-ic"><I.calendar size={28} /></div>
          <div className="ic-empty-t">No tienes invitaciones en {mesNombre.toLowerCase()}</div>
          <div className="ic-empty-s">Cuando el equipo te invite a colaborar, la verás aquí y te avisaremos.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="inv-shell">
      <style>{CSS}</style>
      <div className="inv-list">
        {listado.map(item => {
          const clave     = claveItem(item);
          const ocupado   = enviando === clave;
          const dow       = DOW_CORTO[dowDeISO(item.fecha)];
          const num       = diaDeISO(item.fecha);
          const reabierto = editando[clave];
          const pendiente = item.puede_marcar && !item.bloqueado && (item.estado == null || reabierto);
          const respondido = item.puede_marcar && item.estado != null && !reabierto;
          const cerrado = item.puede_marcar && item.bloqueado && item.estado == null;
          const siColabora = respondido && item.estado === 'disponible';
          const nombre = item.tipo === 'domingo' ? 'Servicio Dominical' : (item.nombre || 'Servicio');

          const key = pendiente ? 'pend' : siColabora ? 'si' : respondido ? 'no' : 'cerr';
          const s = ESTILOS[key];
          const cierre = pendiente ? textoCierre(item.fecha, hoyISO) : null;

          return (
            <div key={clave} className="ic"
              style={{ '--bg': s.bg, '--bd': s.bd, '--bar': s.bar }}>
              <div className="ic-top">
                <div className="ic-chip" style={{ background: s.chipBg }}>
                  <span className="c-dow" style={{ color: s.chipDow }}>{dow}</span>
                  <span className="c-num" style={{ color: s.chipNum }}>{num}</span>
                </div>

                <div className="ic-main">
                  <div className="ic-name">{nombre}</div>

                  <div className="ic-meta">
                    {ministerio && (
                      <span className="ic-mtag">
                        <span className="ic-mdot" style={{ background: item.tipo_color || '#3E6499' }} />
                        {ministerio}
                      </span>
                    )}
                    {cierre && <span className="ic-close"><I.clock size={13} /> {cierre}</span>}
                  </div>

                  {siColabora && (
                    <div className="ic-state" style={{ color: '#15915A' }}>
                      <span className="ic-scircle" style={{ background: '#15915A' }}><I.check size={13} /></span>
                      Sí colaboro
                    </div>
                  )}
                  {respondido && !siColabora && (
                    <div className="ic-state" style={{ color: '#D23B36' }}>
                      <span className="ic-scircle" style={{ background: '#D23B36' }}><I.x size={13} /></span>
                      No podré
                    </div>
                  )}
                  {cerrado && (
                    <div className="ic-state" style={{ color: '#7A8699' }}>Sin responder</div>
                  )}
                </div>

                {respondido && !item.bloqueado && (
                  <div className="ic-right">
                    <button type="button" className="ic-cambiar"
                      onClick={() => setEditando(e => ({ ...e, [clave]: true }))}>
                      Cambiar
                    </button>
                  </div>
                )}
                {cerrado && (
                  <div className="ic-right"><span className="ic-lock"><I.clock size={14} /> Ya cerró</span></div>
                )}
              </div>

              {pendiente && (
                <div className="ic-actions">
                  <button type="button" className="ic-btn ic-yes" disabled={ocupado}
                    onClick={() => marcar(item, 'disponible')}>
                    <I.check size={18} /> {ocupado ? '…' : 'Sí colaboro'}
                  </button>
                  <button type="button" className="ic-btn ic-no" disabled={ocupado}
                    onClick={() => marcar(item, 'no_disponible')}>
                    <I.x size={18} /> {ocupado ? '…' : 'No podré'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {error && <div className="inv-err">{error}</div>}
      </div>
    </div>
  );
}
