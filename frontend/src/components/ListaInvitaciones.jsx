import { I } from './Icons';
import { claveItem } from '../hooks/useDisponibilidadMes';

// Lista de invitaciones del voluntario: cada fecha es una TARJETA (fondo suave +
// sombra, navy/naranja en AGS, negro/menta en GDL). Presentacional: recibe el
// listado y callbacks del hook useDisponibilidadMes; no duplica lógica de guardado.

const DOW_CORTO = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const diaDeISO = (iso) => Number(iso.slice(8, 10));
const dowDeISO = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};
const mesAnioDeISO = (iso) => `${MESES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

// Paleta por campus: navy/naranja (AGS) o negro/menta (GDL). El verde de
// "respondido sí" y los grises son iguales en ambos campus.
const temaDe = (campus) => {
  const gdl = campus === 'gdl';
  return {
    ink:          gdl ? '#0A0A0A' : '#112540',
    accent:       gdl ? '#2DD4BF' : '#FF6B2B',
    accentText:   gdl ? '#0A0A0A' : '#FFFFFF',
    accentShadow: gdl ? '0 2px 8px rgba(45,212,191,0.35)' : '0 2px 8px rgba(255,107,43,0.35)',
    domLight:     gdl ? '#6EE7D6' : '#FF9B6B',
    cardPendSh:   gdl ? '0 4px 16px rgba(10,10,10,0.10)' : '0 4px 16px rgba(17,37,64,0.10)',
  };
};

const CSS = `
.inv-shell{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;color:#16233A;width:100%;}
.inv-shell *{box-sizing:border-box;}
.inv-list{display:flex;flex-direction:column;}
.inv-msg{padding:14px 2px;font-size:15px;color:#8A9BB0;}
.inv-err{margin:6px 0 0;padding:10px 12px;border-radius:10px;background:#FBEAE9;border:1px solid #F3CBC9;color:#D23B36;font-size:14px;font-weight:600;}

.inv-card{border-radius:16px;padding:16px;margin-bottom:12px;}
.inv-card:last-child{margin-bottom:0;}
.inv-top{display:flex;align-items:center;gap:14px;}
.inv-datebox{width:52px;height:52px;border-radius:12px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.inv-datebox .d-dow{font-size:10px;font-weight:600;letter-spacing:.05em;line-height:1;}
.inv-datebox .d-num{font-size:22px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums;}
.inv-mid{flex:1;min-width:0;}
.inv-name{font-size:18px;font-weight:600;line-height:1.2;overflow-wrap:anywhere;}
.inv-sub{font-size:14px;margin-top:4px;display:flex;align-items:center;gap:7px;}
.inv-circle{width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;}
.inv-btns{display:flex;gap:10px;margin-top:14px;}
.inv-shell .inv-btn{flex:1;min-width:0;min-height:48px;border-radius:12px;font-size:16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-family:inherit;}
.inv-shell .inv-btn:disabled{opacity:.6;cursor:default;}
.inv-shell .inv-cambiar{flex-shrink:0;min-height:40px;border-radius:10px;padding:0 16px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;white-space:nowrap;}
.inv-lock{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:#99A5B5;white-space:nowrap;}
`;

const Cambiar = ({ onClick }) => (
  <button type="button" className="inv-cambiar" onClick={onClick}
    style={{ fontFamily: 'inherit', background: '#FFFFFF', color: '#5B6675', border: '1.5px solid #D5DCE5' }}>
    Cambiar
  </button>
);

export default function ListaInvitaciones({
  listado = [],
  marcar,
  enviando,
  editando = {},
  setEditando,
  campus = 'ags',
  cargando = false,
  error = '',
  emptyText = 'No tienes invitaciones por ahora.',
}) {
  const t = temaDe(campus);

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
            const dow       = DOW_CORTO[dowDeISO(item.fecha)];
            const num       = diaDeISO(item.fecha);
            const reabierto = editando[clave];
            const pendiente = item.puede_marcar && !item.bloqueado && (item.estado == null || reabierto);
            const respondido = item.puede_marcar && item.estado != null && !reabierto;
            const cerrado = item.puede_marcar && item.bloqueado && item.estado == null;
            const siColabora = respondido && item.estado === 'disponible';
            const nombre = item.tipo === 'domingo' ? 'Servicio' : (item.nombre || 'Servicio');

            // Estilos de la tarjeta y del bloque de fecha según estado.
            let card, box, dCol, nCol, nameColor;
            if (pendiente) {
              card = { background: '#FFFFFF', border: `1.5px solid ${t.accent}`, boxShadow: t.cardPendSh };
              box = { background: t.ink }; dCol = t.domLight; nCol = '#FFFFFF'; nameColor = t.ink;
            } else if (siColabora) {
              card = { background: '#F0FAF4', boxShadow: '0 2px 10px rgba(17,37,64,0.05)' };
              box = { background: '#FFFFFF', border: '1px solid #C5E8D3' }; dCol = '#16A34A'; nCol = t.ink; nameColor = t.ink;
            } else if (respondido) {
              card = { background: '#F4F6F8', boxShadow: '0 2px 10px rgba(17,37,64,0.05)' };
              box = { background: '#FFFFFF', border: '1px solid #DDE3EA' }; dCol = '#99A5B5'; nCol = '#5B6675'; nameColor = '#5B6675';
            } else { // cerrado sin responder
              card = { background: '#F4F6F8' };
              box = { background: '#FFFFFF', border: '1px solid #DDE3EA' }; dCol = '#99A5B5'; nCol = '#5B6675'; nameColor = '#5B6675';
            }

            return (
              <div key={clave} className="inv-card" style={card}>
                <div className="inv-top">
                  <div className="inv-datebox" style={box}>
                    <span className="d-dow" style={{ color: dCol }}>{dow}</span>
                    <span className="d-num" style={{ color: nCol }}>{num}</span>
                  </div>

                  <div className="inv-mid">
                    <div className="inv-name" style={{ color: nameColor }}>{nombre}</div>

                    {pendiente && (
                      <div className="inv-sub" style={{ color: '#8A9BB0' }}>{mesAnioDeISO(item.fecha)}</div>
                    )}
                    {siColabora && (
                      <div className="inv-sub" style={{ color: '#16A34A', fontWeight: 500 }}>
                        <span className="inv-circle" style={{ background: '#16A34A' }}><I.check size={12} /></span>
                        Sí colaboro
                      </div>
                    )}
                    {respondido && !siColabora && (
                      <div className="inv-sub" style={{ color: '#99A5B5', fontWeight: 500 }}>
                        <span className="inv-circle" style={{ background: '#B5BFCB' }}><I.x size={12} /></span>
                        No podré
                      </div>
                    )}
                    {cerrado && (
                      <div className="inv-sub" style={{ color: '#99A5B5' }}>No respondiste</div>
                    )}
                  </div>

                  {respondido && !item.bloqueado && (
                    <Cambiar onClick={() => setEditando(e => ({ ...e, [clave]: true }))} />
                  )}
                  {cerrado && (
                    <span className="inv-lock"><I.clock size={15} /> Ya cerró</span>
                  )}
                </div>

                {pendiente && (
                  <div className="inv-btns">
                    <button
                      type="button" className="inv-btn" disabled={ocupado}
                      onClick={() => marcar(item, 'disponible')}
                      style={{ fontFamily: 'inherit', fontWeight: 600, background: t.accent, color: t.accentText, border: 'none', boxShadow: t.accentShadow }}
                    >
                      <I.check size={17} /> {ocupado ? '…' : 'Sí colaboro'}
                    </button>
                    <button
                      type="button" className="inv-btn" disabled={ocupado}
                      onClick={() => marcar(item, 'no_disponible')}
                      style={{ fontFamily: 'inherit', fontWeight: 500, background: '#FFFFFF', color: '#5B6675', border: '1.5px solid #D5DCE5' }}
                    >
                      <I.x size={17} /> {ocupado ? '…' : 'No podré'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {error && <div className="inv-err">{error}</div>}
        </div>
      )}
    </div>
  );
}
