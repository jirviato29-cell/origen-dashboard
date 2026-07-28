import { useEffect, useMemo, useState } from 'react';
import { voluntarioDisponibilidadApi } from '../services/api';

// Lógica compartida de la disponibilidad del voluntario (getMes + marcar + la
// lista de fechas que le tocan), usada por el calendario del panel Y por la
// página de Invitaciones para NO duplicar el fetch ni el guardado.
//
// Un domingo con evento produce dos items ese día; cada item se identifica por
// fecha + evento_id (null → 'dom').

export const claveItem = (item) => `${item.fecha}-${item.evento_id ?? 'dom'}`;

const mesDeHoy = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};
const sumaMes = (mes, n) => {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export default function useDisponibilidadMes() {
  const [mes,      setMes]      = useState(mesDeHoy);
  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');
  const [enviando, setEnviando] = useState(null);   // clave del item que se envía
  const [editando, setEditando] = useState({});     // claveItem -> true (reabrir tras "Cambiar")
  const [recarga,  setRecarga]  = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data: d } = await voluntarioDisponibilidadApi.getMes(mes);
        if (vivo) { setData(d); setError(''); }
      } catch (err) {
        if (vivo) {
          setError(err.response?.data?.error || 'No se pudo cargar tu calendario');
          setData(null);
        }
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [mes, recarga]);

  const dias   = data?.dias ?? [];
  const hoyISO = data?.hoy ?? '';

  const irAMes = (n) => { setCargando(true); setMes(m => sumaMes(m, n)); setEditando({}); };
  const irHoy  = () => { setCargando(true); setMes(mesDeHoy()); setEditando({}); };

  async function marcar(item, estado) {
    const clave = claveItem(item);
    setEnviando(clave);
    setError('');
    try {
      await voluntarioDisponibilidadApi.marcar({
        fecha: item.fecha, evento_id: item.evento_id, estado,
      });
      setData(d => ({
        ...d,
        dias: d.dias.map(x =>
          x.fecha === item.fecha && x.evento_id === item.evento_id ? { ...x, estado } : x),
      }));
      setEditando(e => { const n = { ...e }; delete n[clave]; return n; });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar tu respuesta');
      if (err.response?.status === 403) { setCargando(true); setRecarga(n => n + 1); }
    } finally {
      setEnviando(null);
    }
  }

  // Fechas que le tocan al voluntario: domingos (siempre) + eventos donde
  // puede_marcar, de hoy en adelante. Orden por prioridad de acción:
  // 0 pendiente-abierto · 1 respondido · 2 cerrado; luego por fecha.
  const listado = useMemo(() => {
    const prioridad = (d) => {
      if (d.estado) return 1;
      if (d.bloqueado) return 2;
      return 0;
    };
    return [...dias]
      .filter(d => (!hoyISO || d.fecha >= hoyISO) && (d.tipo === 'domingo' || d.puede_marcar))
      .sort((a, b) => {
        const pa = prioridad(a), pb = prioridad(b);
        if (pa !== pb) return pa - pb;
        if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
        return a.tipo === 'domingo' ? -1 : 1;
      });
  }, [dias, hoyISO]);

  return {
    mes, data, cargando, error, dias, hoyISO,
    enviando, editando, setEditando,
    marcar, listado, irAMes, irHoy,
  };
}
