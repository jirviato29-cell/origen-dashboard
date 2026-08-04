import { useEffect, useMemo, useState } from 'react';
import { temaCampus } from '../../theme/campusTema';
import { calendarioApi } from '../../services/api';
import Modal from '../../components/Modal';
import CalendarioMes from '../../components/CalendarioMes';
import useLiderPerfil from '../../hooks/useLiderPerfil';

// Calendario del líder de ministerio: la MISMA cuadrícula del voluntario
// (componente compartido CalendarioMes), pero informativa y resaltando los
// eventos donde participa SU ministerio. El ministerio del líder sale del token
// (GET /api/lider/perfil); los eventos, del mismo GET /api/calendario que ya
// devuelve ministerio_ids/ministerios por evento y filtra por campus del token.
// Aquí el líder NO marca disponibilidad: al tocar un día ve el detalle.

const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const pad = (n) => String(n).padStart(2, '0');
const mesDeHoy = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}`; };
const todayISO = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };
const sumaMes = (mes, n) => {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};
const dowDeISO = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};
const esDomingo = (iso) => dowDeISO(iso) === 0;
const fechaLarga = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return `${DIAS_LARGO[dowDeISO(iso)]} ${d} de ${MESES[m - 1]} de ${a}`;
};

// Un evento del calendario → item normalizado con el shape de CalendarioMes.
const aItem = (ev) => ({
  tipo: 'evento',
  tipo_evento: ev.tipo,
  nombre: ev.nombre,
  evento_id: ev.id,
  id: ev.id,
  fecha: (ev.fecha || '').slice(0, 10),
  tipo_color: ev.tipo_color,
  ministerio_ids: Array.isArray(ev.ministerio_ids) ? ev.ministerio_ids : [],
  ministerios: Array.isArray(ev.ministerios) ? ev.ministerios : [],
});

export default function CalendarioLider() {
  const { ministerioId, nombre: ministerioNombre } = useLiderPerfil();
  const [mes, setMes] = useState(mesDeHoy);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState(null);

  const hoyISO = todayISO();
  const year = mes.slice(0, 4);

  // Campus solo para el theming (el backend ya filtra por el campus del token).
  const campus = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';
  const accent = temaCampus(campus).accent;

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    calendarioApi.getAll({ year })
      .then(({ data }) => { if (vivo) setEventos(Array.isArray(data) ? data : []); })
      .catch(() => { if (vivo) setEventos([]); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [year]);

  // Eventos indexados por fecha (para pintar la celda de ese día).
  const eventosPorFecha = useMemo(() => {
    const map = new Map();
    for (const ev of eventos) {
      const it = aItem(ev);
      if (!it.fecha) continue;
      if (!map.has(it.fecha)) map.set(it.fecha, []);
      map.get(it.fecha).push(it);
    }
    return map;
  }, [eventos]);

  // Items de un día: sus eventos + (si es domingo) el servicio genérico, para que
  // la cuadrícula pinte "Servicio" en domingos igual que el calendario del voluntario.
  const itemsDe = (fecha) => {
    const base = eventosPorFecha.has(fecha) ? [...eventosPorFecha.get(fecha)] : [];
    if (esDomingo(fecha)) base.push({ tipo: 'domingo', fecha });
    return base;
  };

  // ¿Participa MI ministerio en este item (evento)? Comparación tolerante a tipos.
  const participaMiMinisterio = (item) => {
    if (!ministerioId || item.tipo !== 'evento') return false;
    return (item.ministerio_ids || []).map(String).includes(String(ministerioId));
  };

  // Lista de abajo: solo eventos especiales del mes visible, de hoy en adelante.
  const indice = useMemo(() => {
    return eventos
      .map(aItem)
      .filter(d => d.fecha && d.fecha.slice(0, 7) === mes && (!hoyISO || d.fecha >= hoyISO))
      .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  }, [eventos, mes, hoyISO]);

  const eventosDelDia = sel ? (eventosPorFecha.get(sel) || []) : [];

  return (
    <div style={{ width: '100%' }}>
      <CalendarioMes
        mes={mes}
        hoyISO={hoyISO}
        onPrev={() => setMes(m => sumaMes(m, -1))}
        onNext={() => setMes(m => sumaMes(m, 1))}
        onHoy={() => setMes(mesDeHoy())}
        cargando={cargando}
        loadingText="Cargando el calendario…"
        itemsDe={itemsDe}
        indice={indice}
        sel={sel}
        onTocarDia={setSel}
        accent={accent}
        destacarItem={participaMiMinisterio}
        destacadoBadge="Tu ministerio"
        indexEmptyText="No hay eventos especiales este mes."
      />

      {sel && (
        <Modal title={fechaLarga(sel)} onClose={() => setSel(null)}>
          <div style={{ fontFamily: '"DM Sans",-apple-system,system-ui,sans-serif', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {esDomingo(sel) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: '#9CB0CC' }} />
                <span style={{ fontSize: 17, fontWeight: 600, color: '#112540' }}>Servicio dominical</span>
              </div>
            )}

            {eventosDelDia.length === 0 && !esDomingo(sel) ? (
              <div style={{ fontSize: 15, color: '#5A6472' }}>Sin eventos este día.</div>
            ) : eventosDelDia.map(ev => {
              const mio = participaMiMinisterio(ev);
              return (
                <div key={ev.id} style={{
                  border: `1px solid ${mio ? accent : '#E2E6EC'}`, borderRadius: 12, padding: '13px 15px',
                  background: mio ? 'rgba(0,0,0,0.015)' : '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 17, fontWeight: 600, color: '#112540' }}>{ev.nombre}</span>
                    {mio && (
                      <span style={{
                        fontSize: 15, fontWeight: 700, color: accent, background: 'rgba(0,0,0,0.02)',
                        border: `1px solid ${accent}`, borderRadius: 999, padding: '1px 10px', whiteSpace: 'nowrap', flexShrink: 0,
                      }}>Tu ministerio</span>
                    )}
                  </div>
                  <div style={{ fontSize: 15, color: '#5A6472', marginTop: 4 }}>{ev.tipo_evento}</div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#3D4654', marginBottom: 6 }}>
                      {ev.ministerios.length > 0 ? 'Ministerios que participan' : 'Evento abierto a todos los ministerios'}
                    </div>
                    {ev.ministerios.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {ev.ministerios.map(m => {
                          const esMio = String(m.id) === String(ministerioId);
                          return (
                            <span key={m.id} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 15,
                              padding: '4px 11px', borderRadius: 999,
                              border: `1px solid ${esMio ? accent : '#E2E6EC'}`,
                              color: esMio ? accent : '#3D4654', fontWeight: esMio ? 700 : 500,
                            }}>
                              <span style={{ width: 9, height: 9, borderRadius: '50%', background: m.color || '#64748B', flexShrink: 0 }} />
                              {m.nombre}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {ministerioNombre && (
              <div style={{ fontSize: 15, color: '#7A8699' }}>
                Tu ministerio: <strong style={{ color: '#3D4654' }}>{ministerioNombre}</strong>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
