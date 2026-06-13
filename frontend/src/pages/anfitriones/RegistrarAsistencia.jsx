import { useEffect, useState, useCallback } from 'react';
import { asistenciaApi } from '../../services/api';
import { useRegistrarModal } from '../../context/RegistrarModalContext';
import { useIsMobile } from '../../utils/useIsMobile';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getTargetSunday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + diff);
  return sunday;
}

function toISODate(d) { return d.toISOString().slice(0, 10); }

function formatDateLong(date) {
  return date
    .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
}

export default function RegistrarAsistencia() {
  const isMobile   = useIsMobile();
  const sunday     = getTargetSunday();
  const fechaISO   = toISODate(sunday);
  const fechaLabel = formatDateLong(sunday);

  const { openModal } = useRegistrarModal();

  const [historial, setHistorial] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [success, setSuccess]     = useState(false);

  const loadHistorial = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await asistenciaApi.getAll({ limit: 20 });
      setHistorial(data.slice(0, 18));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistorial(); }, [loadHistorial]);

  useEffect(() => {
    const handler = () => { loadHistorial(); setSuccess(true); setTimeout(() => setSuccess(false), 3000); };
    window.addEventListener('asistencia-saved', handler);
    return () => window.removeEventListener('asistencia-saved', handler);
  }, [loadHistorial]);

  return (
    <div className="px-4 py-6 sm:p-8 max-w-4xl mx-auto">

      {/* Fecha y botón */}
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Próximo servicio dominical</p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 leading-tight" style={{ color: '#C1644A' }}>
          {fechaLabel}
        </h1>
        <p className="text-gray-400 text-sm mb-6">{fechaISO}</p>

        <button
          onClick={openModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-md active:scale-95 transition-all"
          style={{ backgroundColor: '#C1644A' }}
        >
          <span className="text-2xl" role="img" aria-label="mano">✋</span>
          Registrar Asistencia
        </button>
      </div>

      {/* Confirmación éxito */}
      {success && (
        <div className="mb-6 rounded-2xl bg-green-600 px-6 py-5 text-center shadow-lg">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-white font-bold text-lg leading-tight">¡Gracias por tu registro!</p>
          <p className="text-white/80 text-sm mt-1">La asistencia ha quedado guardada.</p>
        </div>
      )}

      {/* Historial */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
          Historial de asistencia
        </h2>

        {loading ? (
          <div className="text-center text-gray-400 py-12 text-sm">Cargando…</div>
        ) : historial.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm px-4">
            Aún no hay registros. ¡Sé el primero en registrar asistencia!
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {historial.map((r) => {
              const rTotal = (r.adultos || 0) + (r.voluntarios || 0) + (r.ninos || 0) + (r.bebes || 0);
              const esEste = r.fecha === fechaISO;
              return (
                <div key={r.id} style={{ background: esEste ? '#FFF4EE' : 'var(--surface)', border: `1px solid ${esEste ? '#E0561B40' : 'var(--border)'}`, borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
                    {fmtDate(r.fecha)}
                    {esEste && (
                      <span style={{ marginLeft: 8, fontSize: 10.5, padding: '2px 8px', borderRadius: 99, background: '#C1644A', color: '#fff', fontWeight: 700 }}>hoy</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 8px' }}>
                    {[
                      { label: 'Adultos',    val: r.adultos ?? '—',    color: '#374151' },
                      { label: 'Volunt.',    val: r.voluntarios ?? '—',color: '#374151' },
                      { label: 'Niños',      val: r.ninos ?? '—',      color: '#374151' },
                      { label: 'Bebés',      val: r.bebes ?? '—',      color: '#374151' },
                      { label: 'Nuevos',     val: r.nuevos > 0 ? r.nuevos : '—', color: '#CBD2DC' },
                      { label: 'Total',      val: rTotal, color: '#C1644A', bold: true },
                    ].map(({ label, val, color, bold }) => (
                      <div key={label} style={{ background: label === 'Total' ? 'rgba(193,100,74,0.08)' : 'transparent', borderRadius: 8, padding: label === 'Total' ? '4px 8px' : 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9CA3AF' }}>{label}</div>
                        <div style={{ fontSize: 16, fontWeight: bold ? 800 : 600, color, fontVariantNumeric: 'tabular-nums' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-4 py-3 text-left">Domingo</th>
                  <th className="px-3 py-3 text-center">Adultos</th>
                  <th className="px-3 py-3 text-center">Volunt.</th>
                  <th className="px-3 py-3 text-center">Niños</th>
                  <th className="px-3 py-3 text-center">Bebés</th>
                  <th className="px-3 py-3 text-center text-gray-300">Nuevos</th>
                  <th className="px-3 py-3 text-center font-semibold" style={{ color: '#C1644A' }}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historial.map((r) => {
                  const rowTotal = (r.adultos || 0) + (r.voluntarios || 0) + (r.ninos || 0) + (r.bebes || 0);
                  const esEste   = r.fecha === fechaISO;
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${esEste ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">
                        {fmtDate(r.fecha)}
                        {esEste && (
                          <span
                            className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: '#C1644A' }}
                          >
                            hoy
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-700">{r.adultos ?? '—'}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{r.voluntarios ?? '—'}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{r.ninos ?? '—'}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{r.bebes ?? '—'}</td>
                      <td className="px-3 py-3 text-center text-gray-300 italic">
                        {r.nuevos > 0 ? r.nuevos : '—'}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-base" style={{ color: '#C1644A' }}>
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
