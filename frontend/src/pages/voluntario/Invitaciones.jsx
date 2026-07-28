import { useEffect, useState } from 'react';
import AvisoDestacado from '../../components/AvisoDestacado';
import ListaInvitaciones from '../../components/ListaInvitaciones';
import { I } from '../../components/Icons';
import { miPerfilApi } from '../../services/api';
import useDisponibilidadMes, { mesDeHoy, sumaMes } from '../../hooks/useDisponibilidadMes';

// Pestaña "Invitaciones" del voluntario (sistema azul marino + naranja, pensada
// para adultos mayores). Banner resumen navy con 3 contadores + dos columnas de
// meses (actual y siguiente) con tarjetas de invitación por estado. Reutiliza el
// hook useDisponibilidadMes (mismo fetch + marcar), sin duplicar lógica.

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const nombreMesDe = (mes) => MESES[Number(mes.slice(5, 7)) - 1];

const esPendiente = (d) => d.puede_marcar && !d.bloqueado && d.estado == null;
const esSi = (d) => d.estado === 'disponible';
const esNo = (d) => d.estado === 'no_disponible';

const CSS = `
.invp{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:-.006em;width:100%;color:#16233A;}

/* Banner resumen */
.invp-banner{background:linear-gradient(135deg,#0B1A2F 0%,#152C4C 100%);border-radius:18px;padding:22px 24px;display:flex;align-items:center;justify-content:space-between;gap:22px;flex-wrap:wrap;margin-bottom:22px;box-shadow:0 10px 30px rgba(11,26,47,.18);}
.invp-eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;}
.invp-btitle{font-size:23px;font-weight:800;letter-spacing:-.02em;color:#fff;line-height:1.15;}
.invp-bsub{font-size:14px;color:#9CB0CC;margin-top:5px;max-width:420px;line-height:1.4;}
.invp-stats{display:flex;gap:12px;flex-shrink:0;}
.invp-stat{background:#1A3354;border-radius:14px;padding:12px 18px;min-width:96px;text-align:center;}
.invp-stat-n{font-size:26px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;}
.invp-stat-l{font-size:12.5px;font-weight:600;color:#9CB0CC;margin-top:5px;}

/* Dos columnas de meses */
.invp-grid{display:grid;grid-template-columns:1fr;gap:20px;}
@media(min-width:820px){ .invp-grid{grid-template-columns:1fr 1fr;gap:24px;} }
.invp-mescard{background:#fff;border:1px solid #E2E6EC;border-radius:16px;padding:18px 20px 20px;box-shadow:0 1px 2px rgba(11,26,47,.06);}
.invp-mes-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:14px;padding-bottom:11px;border-bottom:1px solid #EEF1F5;}
.invp-mes-t{display:flex;align-items:baseline;gap:9px;min-width:0;}
.invp-mes-n{font-size:19px;font-weight:800;letter-spacing:-.02em;color:#112540;}
.invp-mes-y{font-size:15px;font-weight:600;color:#A7B0BD;}
.invp-pill{font-size:13px;font-weight:700;border-radius:20px;padding:4px 12px;white-space:nowrap;flex-shrink:0;}

/* Nota de ayuda */
.invp-help{display:flex;align-items:center;gap:10px;margin-top:22px;padding:13px 16px;border-radius:12px;background:#E8F2FA;color:#244169;font-size:14px;font-weight:500;line-height:1.4;}
.invp-help svg{flex-shrink:0;color:#2C86C4;}
`;

function MesCard({ mes, disp, ministerio }) {
  const { listado, marcar, enviando, editando, setEditando, cargando, error, hoyISO } = disp;
  const pend = listado.filter(esPendiente).length;
  const vacio = !cargando && listado.length === 0;

  let pill;
  if (vacio) pill = { txt: 'Sin invitaciones', bg: '#F1F3F6', fg: '#7A8699' };
  else if (pend > 0) pill = { txt: `${pend} por responder`, bg: '#FEF9C3', fg: '#8A6D0F' };
  else pill = { txt: 'Todo respondido', bg: '#E6F5EC', fg: '#15915A' };

  return (
    <div className="invp-mescard">
      <div className="invp-mes-h">
        <div className="invp-mes-t">
          <span className="invp-mes-n">{nombreMesDe(mes)}</span>
          <span className="invp-mes-y">{mes.slice(0, 4)}</span>
        </div>
        {!cargando && <span className="invp-pill" style={{ background: pill.bg, color: pill.fg }}>{pill.txt}</span>}
      </div>
      <ListaInvitaciones
        listado={listado}
        marcar={marcar}
        enviando={enviando}
        editando={editando}
        setEditando={setEditando}
        hoyISO={hoyISO}
        ministerio={ministerio}
        mesNombre={nombreMesDe(mes)}
        cargando={cargando}
        error={error}
      />
    </div>
  );
}

export default function Invitaciones() {
  const campus = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';
  const accent = campus === 'gdl' ? '#2DD4BF' : '#FF8A52';

  const mesA = mesDeHoy();
  const mesB = sumaMes(mesA, 1);
  const dispA = useDisponibilidadMes(mesA);
  const dispB = useDisponibilidadMes(mesB);

  const [ministerio, setMinisterio] = useState(null);
  useEffect(() => {
    let vivo = true;
    miPerfilApi.get()
      .then(({ data }) => { if (vivo) setMinisterio(data?.ministerio || null); })
      .catch(() => { if (vivo) setMinisterio(null); });
    return () => { vivo = false; };
  }, []);

  const todos = [...dispA.listado, ...dispB.listado];
  const nPend = todos.filter(esPendiente).length;
  const nSi = todos.filter(esSi).length;
  const nNo = todos.filter(esNo).length;

  const eyebrow = nPend === 0
    ? 'Estás al día'
    : `Tienes ${nPend} ${nPend === 1 ? 'invitación' : 'invitaciones'} por responder`;

  return (
    <div className="invp">
      <style>{CSS}</style>
      <AvisoDestacado />

      <div className="invp-banner">
        <div style={{ minWidth: 0 }}>
          <div className="invp-eyebrow" style={{ color: accent }}>{eyebrow}</div>
          <div className="invp-btitle">Confirma si puedes colaborar</div>
          <div className="invp-bsub">Responde para que el equipo sepa con quién cuenta cada domingo.</div>
        </div>
        <div className="invp-stats">
          <div className="invp-stat"><div className="invp-stat-n" style={{ color: '#F5C451' }}>{nPend}</div><div className="invp-stat-l">Por responder</div></div>
          <div className="invp-stat"><div className="invp-stat-n" style={{ color: '#5FD08D' }}>{nSi}</div><div className="invp-stat-l">Sí colaboro</div></div>
          <div className="invp-stat"><div className="invp-stat-n" style={{ color: '#F0756E' }}>{nNo}</div><div className="invp-stat-l">No podré</div></div>
        </div>
      </div>

      <div className="invp-grid">
        <MesCard mes={mesA} disp={dispA} ministerio={ministerio} />
        <MesCard mes={mesB} disp={dispB} ministerio={ministerio} />
      </div>

      <div className="invp-help">
        <I.clock size={17} />
        Puedes cambiar tu respuesta hasta 1 día antes de la fecha. Si tienes dudas, avísale a tu líder.
      </div>
    </div>
  );
}
