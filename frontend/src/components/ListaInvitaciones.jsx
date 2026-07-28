import { I } from './Icons';
import { claveItem } from '../hooks/useDisponibilidadMes';

// Lista COMPACTA de invitaciones del voluntario: una fila horizontal por fecha
// (no tarjetas). Izquierda: bloque de fecha (DOW + número). Centro: nombre del
// evento + estado. Derecha: acción (dos botones si no ha respondido, "Cambiar"
// si ya respondió). Presentacional: recibe el listado y callbacks del hook
// useDisponibilidadMes; no duplica lógica de guardado.

const DOW_CORTO = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const diaDeISO = (iso) => Number(iso.slice(8, 10));
const dowDeISO = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};

const CSS = `
.inv-shell{
  --navy-900:#112540;--gray-700:#3D4654;--gray-600:#5A6472;--gray-500:#7A8699;
  --gray-300:#CBD2DC;--gray-200:#E2E6EC;--gray-100:#EEF1F5;
  --green-600:#15915A;--red-600:#D23B36;--red-50:#FBEAE9;
  font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  letter-spacing:-.006em;color:#16233A;width:100%;
}
.inv-shell *{box-sizing:border-box;}
.inv-list{display:flex;flex-direction:column;}
.inv-msg{padding:16px 4px;font-size:15px;color:var(--gray-500);}
.inv-err{margin:6px 0 0;padding:10px 12px;border-radius:10px;background:var(--red-50);border:1px solid #F3CBC9;color:var(--red-600);font-size:14px;font-weight:600;}

.inv-row{display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:.5px solid var(--gray-200);flex-wrap:wrap;}
.inv-row:last-child{border-bottom:none;}
.inv-date{width:46px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;text-align:center;}
.inv-dow{font-size:12px;font-weight:700;letter-spacing:.03em;color:var(--gray-500);}
.inv-day{font-size:19px;font-weight:600;color:var(--navy-900);line-height:1.1;font-variant-numeric:tabular-nums;}
.inv-mid{flex:1;min-width:130px;}
.inv-name{font-size:15px;font-weight:500;color:var(--navy-900);line-height:1.25;overflow-wrap:anywhere;}
.inv-estado{font-size:14px;font-weight:600;margin-top:3px;display:inline-flex;align-items:center;gap:6px;}
.inv-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.inv-shell .inv-btn{min-height:44px;padding:9px 14px;border-radius:10px;font-size:14px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;font-family:inherit;white-space:nowrap;}
.inv-shell .inv-btn:disabled{opacity:.55;cursor:default;}
.inv-shell .inv-cambiar{min-height:44px;padding:9px 16px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;background:#fff;color:var(--navy-900);border:1px solid var(--gray-300);white-space:nowrap;}
.inv-lock{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--gray-500);}

/* Teléfono: las acciones bajan a una segunda línea de la fila, ancho completo y
   tocables (44px). El bloque fecha+nombre queda arriba. */
@media(max-width:639px){
  .inv-actions{width:100%;}
  .inv-shell .inv-btn{flex:1;}
}
`;

export default function ListaInvitaciones({
  listado = [],
  marcar,
  enviando,
  editando = {},
  setEditando,
  accent = '#FF6B2B',
  cargando = false,
  error = '',
  emptyText = 'No tienes invitaciones por ahora.',
}) {
  if (!cargando && listado.length === 0) {
    return (
      <div className="inv-shell">
        <style>{CSS}</style>
        <div className="inv-msg">{emptyText}</div>
      </div>
    );
  }

  return (
    <div className="inv-shell">
      <style>{CSS}</style>
      {cargando ? (
        <div className="inv-msg">Cargando…</div>
      ) : (
        <div className="inv-list">
          {listado.map(item => {
            const clave     = claveItem(item);
            const ocupado   = enviando === clave;
            const dow       = dowDeISO(item.fecha);
            const reabierto = editando[clave];
            const pendienteAbierto = item.puede_marcar && !item.bloqueado && (item.estado == null || reabierto);
            const respondido = item.puede_marcar && item.estado != null && !reabierto;
            const cerradoSinResp = item.puede_marcar && item.bloqueado && item.estado == null;
            const nombre = item.tipo === 'domingo' ? 'Servicio' : (item.nombre || 'Servicio');

            // Estado (centro).
            let estado;
            if (respondido && item.estado === 'disponible') {
              estado = <span className="inv-estado" style={{ color: 'var(--green-600)' }}><I.check size={15} /> Sí colaboro</span>;
            } else if (respondido) {
              estado = <span className="inv-estado" style={{ color: 'var(--gray-600)' }}><I.x size={15} /> No podré</span>;
            } else if (cerradoSinResp) {
              estado = <span className="inv-estado" style={{ color: 'var(--gray-500)' }}>No respondiste</span>;
            } else {
              estado = <span className="inv-estado" style={{ color: 'var(--gray-500)' }}>Sin responder</span>;
            }

            return (
              <div key={clave} className="inv-row">
                <div className="inv-date">
                  <span className="inv-dow">{DOW_CORTO[dow]}</span>
                  <span className="inv-day">{diaDeISO(item.fecha)}</span>
                </div>

                <div className="inv-mid">
                  <div className="inv-name">{nombre}</div>
                  {estado}
                </div>

                {pendienteAbierto ? (
                  <div className="inv-actions">
                    <button
                      type="button" className="inv-btn" disabled={ocupado}
                      onClick={() => marcar(item, 'disponible')}
                      style={{ fontFamily: 'inherit', background: accent, color: '#FFFFFF', border: `2px solid ${accent}` }}
                    >
                      <I.check size={16} /> {ocupado ? '…' : 'Sí colaboro'}
                    </button>
                    <button
                      type="button" className="inv-btn" disabled={ocupado}
                      onClick={() => marcar(item, 'no_disponible')}
                      style={{ fontFamily: 'inherit', background: '#FFFFFF', color: 'var(--navy-900)', border: '2px solid var(--gray-300)' }}
                    >
                      <I.x size={16} /> {ocupado ? '…' : 'No podré'}
                    </button>
                  </div>
                ) : respondido ? (
                  <div className="inv-actions">
                    {!item.bloqueado && (
                      <button
                        type="button" className="inv-cambiar"
                        onClick={() => setEditando(e => ({ ...e, [clave]: true }))}
                      >
                        Cambiar
                      </button>
                    )}
                  </div>
                ) : cerradoSinResp ? (
                  <div className="inv-actions">
                    <span className="inv-lock"><I.clock size={15} /> Ya cerró</span>
                  </div>
                ) : null}
              </div>
            );
          })}
          {error && <div className="inv-err">{error}</div>}
        </div>
      )}
    </div>
  );
}
