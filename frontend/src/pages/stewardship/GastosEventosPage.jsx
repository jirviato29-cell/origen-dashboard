import { useState, useEffect } from 'react';
import { calendarioApi, participantesApi, abonosApi, gastosEventosApi } from '../../services/api';
import { fmtFechaShort, toISODate } from '../../utils/fecha';
import { I } from '../../components/Icons';

// ── Campus theming (mismo criterio isGdl que el resto de pantallas) ──────────
const isGdl  = localStorage.getItem('campus_activo') === 'gdl';
const ACCENT = isGdl ? '#2DD4BF' : '#112540';   // MINT gdl / NAVY ags

const NAVY_700 = '#244169';
const GRAY_700 = '#3D4654';
const GRAY_500 = '#7A8699';
const GRAY_300 = '#CBD2DC';
const GRAY_200 = '#E2E6EC';
const GRAY_100 = '#EEF1F5';
const GRAY_50  = '#F6F7F9';
const GREEN    = '#15915A';
const RED      = '#D23B36';

function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function GastosEventosPage() {
  const [eventos,          setEventos]          = useState([]);
  const [participantesMap, setParticipantesMap] = useState({});
  const [abonosMap,        setAbonosMap]        = useState({});
  const [gastosMap,        setGastosMap]        = useState({});
  const [loading,          setLoading]          = useState(true);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const [evRes, partRes, abonosRes] = await Promise.all([
          calendarioApi.getAll({ en_punto_encuentro: true }),
          participantesApi.getAll(),
          abonosApi.getAll(),
        ]);
        if (cancelado) return;

        setEventos(evRes.data);

        const pMap = {};
        partRes.data.forEach(p => {
          if (!pMap[p.evento_id]) pMap[p.evento_id] = [];
          pMap[p.evento_id].push(p);
        });
        setParticipantesMap(pMap);

        const aMap = {};
        abonosRes.data.forEach(a => {
          if (!aMap[a.participante_id]) aMap[a.participante_id] = [];
          aMap[a.participante_id].push(a);
        });
        setAbonosMap(aMap);
      } catch {
        if (!cancelado) { setEventos([]); setParticipantesMap({}); setAbonosMap({}); }
      }

      // Los gastos van en un try/catch SEPARADO: si el endpoint aún no está
      // desplegado en Render, la pantalla no se rompe (gastos = 0 por evento).
      try {
        const { data: gastos } = await gastosEventosApi.getAll();
        if (cancelado) return;
        const gMap = {};
        gastos.forEach(g => {
          gMap[g.evento_id] = (gMap[g.evento_id] || 0) + parseFloat(g.monto || 0);
        });
        setGastosMap(gMap);
      } catch {
        if (!cancelado) setGastosMap({});
      }

      if (!cancelado) setLoading(false);
    })();

    return () => { cancelado = true; };
  }, []);

  // ── Filas derivadas — todos los eventos de PE (activos y concluidos) ─────────
  const filas = [...eventos]
    .sort((a, b) => (toISODate(b.fecha) || '').localeCompare(toISODate(a.fecha) || ''))
    .map(e => {
      const parts     = participantesMap[e.id] || [];
      const inscritos = parts.length;
      const recaudado = parts.reduce(
        (s, p) => s + (abonosMap[p.id] || []).reduce((ss, a) => ss + parseFloat(a.monto || 0), 0),
        0
      );
      const gastos    = gastosMap[e.id] || 0;
      const neto      = recaudado - gastos;
      const concluido = e.cerrado === true;
      return { e, inscritos, recaudado, gastos, neto, concluido };
    });

  // ── Totales generales ────────────────────────────────────────────────────────
  const tot = filas.reduce((acc, f) => {
    acc.recaudado += f.recaudado;
    acc.gastos    += f.gastos;
    acc.neto      += f.neto;
    return acc;
  }, { recaudado: 0, gastos: 0, neto: 0 });

  return (
    <div className="ge-root">
      <style>{`
        .ge-root { display: flex; flex-direction: column; gap: 14px; }
        .ge-head { display: flex; align-items: center; gap: 12px; }
        .ge-head-icon {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: ${ACCENT}; color: #fff;
        }
        .ge-title { font-size: 18px; font-weight: 700; color: var(--ink); }
        .ge-sub   { font-size: 12.5px; color: var(--muted); margin-top: 1px; }

        .ge-table-wrap { overflow-x: auto; }
        .ge-table {
          width: 100%; border-collapse: collapse; font-size: 13.5px;
          min-width: 640px;
        }
        .ge-table thead th {
          text-align: left; padding: 11px 14px; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em; color: ${GRAY_500};
          background: ${GRAY_50}; border-bottom: 1px solid ${GRAY_200}; white-space: nowrap;
        }
        .ge-table tbody td {
          padding: 12px 14px; border-bottom: 1px solid ${GRAY_100};
          color: ${GRAY_700}; vertical-align: middle;
        }
        .ge-table tbody tr:hover td { background: ${GRAY_50}; }
        .ge-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .ge-th-num { text-align: right; }
        .ge-evento { font-weight: 700; color: var(--ink); }
        .ge-badge {
          display: inline-block; font-size: 10.5px; font-weight: 700;
          padding: 2px 9px; border-radius: 6px;
        }
        .ge-badge.activo    { background: rgba(45,212,191,.14); color: ${GREEN}; }
        .ge-badge.concluido { background: ${GRAY_100}; color: ${GRAY_500}; }
        .ge-neto-pos { color: ${GREEN}; font-weight: 700; }
        .ge-neto-neg { color: ${RED};   font-weight: 700; }
        .ge-tfoot td {
          padding: 12px 14px; border-top: 2px solid ${GRAY_200};
          font-weight: 700; color: var(--ink); background: ${GRAY_50};
        }
        .ge-empty { text-align: center; padding: 44px 0; color: var(--muted); font-size: 14px; }
      `}</style>

      {/* Encabezado */}
      <div className="ge-head">
        <div className="ge-head-icon"><I.receipt size={20} /></div>
        <div>
          <div className="ge-title">Gastos de eventos</div>
          <div className="ge-sub">
            {loading ? 'Cargando…' : `${filas.length} evento${filas.length !== 1 ? 's' : ''} de Punto de Encuentro`}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        {loading ? (
          <div className="ge-empty">Cargando eventos…</div>
        ) : filas.length === 0 ? (
          <div className="ge-empty">Sin eventos de Punto de Encuentro.</div>
        ) : (
          <div className="ge-table-wrap">
            <table className="ge-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th className="ge-th-num">Inscritos</th>
                  <th className="ge-th-num">Recaudado</th>
                  <th className="ge-th-num">Gastos</th>
                  <th className="ge-th-num">Neto</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ e, inscritos, recaudado, gastos, neto, concluido }) => (
                  <tr key={e.id}>
                    <td className="ge-evento">{e.nombre}</td>
                    <td style={{ color: GRAY_500, whiteSpace: 'nowrap' }}>{fmtFechaShort(e.fecha)}</td>
                    <td>
                      <span className={`ge-badge ${concluido ? 'concluido' : 'activo'}`}>
                        {concluido ? 'Concluido' : 'Activo'}
                      </span>
                    </td>
                    <td className="ge-num">{inscritos}</td>
                    <td className="ge-num">{fmtMoney(recaudado)}</td>
                    <td className="ge-num">{fmtMoney(gastos)}</td>
                    <td className={`ge-num ${neto >= 0 ? 'ge-neto-pos' : 'ge-neto-neg'}`}>{fmtMoney(neto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="ge-tfoot">
                  <td colSpan={4}>Total</td>
                  <td className="ge-num">{fmtMoney(tot.recaudado)}</td>
                  <td className="ge-num">{fmtMoney(tot.gastos)}</td>
                  <td className={`ge-num ${tot.neto >= 0 ? 'ge-neto-pos' : 'ge-neto-neg'}`}>{fmtMoney(tot.neto)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
