import { I } from './Icons';
import { claveItem } from '../hooks/useDisponibilidadMes';

// Lista de invitaciones del voluntario (tarjetas "Donde colaboras"): una fecha
// por tarjeta con su estado. Presentacional: recibe el listado y los callbacks
// del hook useDisponibilidadMes. Mismo patrón visual que MisPuestos.

const DOW_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const diaDeISO = (iso) => Number(iso.slice(8, 10));
const dowDeISO = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};

const CSS = `
.inv-shell{
  --navy-900:#112540;--gray-700:#3D4654;--gray-600:#5A6472;--gray-300:#CBD2DC;
  --gray-200:#E2E6EC;--gray-100:#EEF1F5;--gray-50:#F6F7F9;
  --green-600:#15915A;--green-50:#E6F5EC;--red-600:#D23B36;--red-50:#FBEAE9;
  --r-lg:14px;
  font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  letter-spacing:-.006em;color:#16233A;width:100%;
}
.inv-shell *{box-sizing:border-box;}
.inv-list{display:flex;flex-direction:column;gap:12px;}
.inv-msg{padding:22px 10px;text-align:center;font-size:15px;color:var(--gray-600);}
.inv-err{margin:4px 0 0;padding:12px 14px;border-radius:12px;background:var(--red-50);border:1px solid #F3CBC9;color:var(--red-600);font-size:15px;font-weight:600;}
.inv-foot{margin-top:14px;font-size:15px;color:var(--gray-600);text-align:center;}

.dc-card{border:1px solid var(--gray-200);border-radius:var(--r-lg);background:#fff;padding:14px 16px;display:flex;flex-direction:column;gap:8px;}
.dc-row1{display:flex;align-items:baseline;justify-content:space-between;gap:12px;}
.dc-fecha{font-size:15px;font-weight:500;color:var(--navy-900);white-space:nowrap;}
.dc-tipo{font-size:15px;font-weight:500;color:var(--gray-600);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;}
.dc-nombre{font-size:20px;font-weight:500;color:var(--navy-900);line-height:1.25;overflow-wrap:anywhere;}
.dc-sep{border:none;border-top:.5px solid var(--gray-200);margin:4px 0 2px;width:100%;}
.dc-state-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.dc-state{display:inline-flex;align-items:center;gap:9px;font-size:17px;font-weight:700;}
.dc-state-ic{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;}
.dc-lock{display:inline-flex;align-items:center;gap:7px;font-size:15px;font-weight:700;color:var(--gray-600);}
.dc-btns{display:flex;gap:10px;}
.inv-shell .dc-btn{flex:1;min-width:0;min-height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-family:inherit;}
.inv-shell .dc-btn:disabled{opacity:.55;cursor:default;}
.inv-shell .dc-cambiar{min-height:48px;border-radius:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-family:inherit;}
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
  footNote = 'Los cambios cierran 1 día antes de cada fecha.',
}) {
  return (
    <div className="inv-shell">
      <style>{CSS}</style>
      <div className="inv-list">
        {cargando ? (
          <div className="inv-msg">Cargando…</div>
        ) : listado.length === 0 ? (
          <div className="inv-msg">{emptyText}</div>
        ) : (
          listado.map(item => {
            const clave   = claveItem(item);
            const ocupado = enviando === clave;
            const dow     = dowDeISO(item.fecha);
            const reabierto = editando[clave];
            const pendienteAbierto = item.puede_marcar && !item.bloqueado && (item.estado == null || reabierto);
            const respondido = item.puede_marcar && item.estado != null && !reabierto;
            const cerradoSinResp = item.puede_marcar && item.bloqueado && item.estado == null;
            const tipo = item.tipo === 'domingo' ? 'Servicio dominical' : (item.tipo_evento || 'Evento');
            const nombre = item.tipo === 'domingo' ? 'Servicio' : (item.nombre || 'Servicio');

            return (
              <div key={clave} className="dc-card">
                {/* fila 1: fecha + tipo */}
                <div className="dc-row1">
                  <span className="dc-fecha">{DOW_CORTO[dow]} {diaDeISO(item.fecha)}</span>
                  <span className="dc-tipo">{tipo}</span>
                </div>

                {/* fila 2: nombre del evento */}
                <div className="dc-nombre">{nombre}</div>

                <hr className="dc-sep" />

                {/* fila 3: estado */}
                {pendienteAbierto ? (
                  <div className="dc-btns">
                    <button
                      type="button" className="dc-btn" disabled={ocupado}
                      onClick={() => marcar(item, 'disponible')}
                      style={{ fontFamily: 'inherit', fontSize: 17, fontWeight: 700, background: accent, color: '#FFFFFF', border: `2px solid ${accent}` }}
                    >
                      <I.check size={18} /> {ocupado ? '…' : 'Sí colaboro'}
                    </button>
                    <button
                      type="button" className="dc-btn" disabled={ocupado}
                      onClick={() => marcar(item, 'no_disponible')}
                      style={{ fontFamily: 'inherit', fontSize: 17, fontWeight: 700, background: '#FFFFFF', color: 'var(--navy-900)', border: '2px solid var(--gray-300)' }}
                    >
                      <I.x size={18} /> {ocupado ? '…' : 'No podré'}
                    </button>
                  </div>
                ) : respondido ? (
                  <div className="dc-state-row">
                    {item.estado === 'disponible' ? (
                      <span className="dc-state" style={{ color: 'var(--green-600)' }}>
                        <span className="dc-state-ic" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}><I.check size={16} /></span>
                        Sí colaboro
                      </span>
                    ) : (
                      <span className="dc-state" style={{ color: 'var(--gray-600)' }}>
                        <span style={{ display: 'inline-flex', color: 'var(--gray-600)' }}><I.x size={22} /></span>
                        No podré
                      </span>
                    )}
                    {!item.bloqueado && (
                      <button
                        type="button" className="dc-cambiar"
                        onClick={() => setEditando(e => ({ ...e, [clave]: true }))}
                        style={{ fontFamily: 'inherit', fontSize: 16, fontWeight: 600, padding: '12px 18px', background: '#fff', color: 'var(--navy-900)', border: '1px solid var(--gray-300)' }}
                      >
                        Cambiar
                      </button>
                    )}
                  </div>
                ) : cerradoSinResp ? (
                  <div className="dc-state-row">
                    <span className="dc-state" style={{ color: 'var(--gray-600)' }}>Sin responder</span>
                    <span className="dc-lock"><I.clock size={16} /> Ya cerró</span>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
        {error && <div className="inv-err">{error}</div>}
      </div>
      {!cargando && listado.length > 0 && <div className="inv-foot">{footNote}</div>}
    </div>
  );
}
