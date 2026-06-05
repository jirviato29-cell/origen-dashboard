// Normaliza cualquier formato de fecha a YYYY-MM-DD:
// - "DD/MM/YYYY"      → "YYYY-MM-DD"
// - timestamp/ISO8601 → primeros 10 caracteres
// - "YYYY-MM-DD"      → sin cambios
export function toISODate(raw) {
  if (!raw) return null;
  const s = String(raw);
  const ddmmyyyy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  if (s.length > 10) return s.slice(0, 10);
  return s;
}

export function fmtFecha(raw) {
  const iso = toISODate(raw);
  if (!iso) return 'Sin fecha';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase());
}

export function fmtFechaShort(raw) {
  const iso = toISODate(raw);
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short',
  });
}

export function mesNombre(isoMes) {
  return new Date(isoMes + '-01T00:00:00').toLocaleDateString('es-MX', { month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());
}
