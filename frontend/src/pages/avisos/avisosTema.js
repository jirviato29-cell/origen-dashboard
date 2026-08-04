// Utilidades compartidas por la vista de avisos del destinatario (lista y
// detalle). El theming por campus ahora vive en el tema central
// (src/theme/campusTema.js); aquí solo se re-exporta con la MISMA firma (sin
// argumentos, leyendo campus_activo) para no romper los imports existentes.

import { temaCampus as temaCampusCentral } from '../../theme/campusTema';

export const FONT = '"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif';

// Re-export: mantiene la firma sin argumentos (lee campus_activo de localStorage)
// y delega los colores al tema central. Devuelve el objeto de tema del campus.
export function temaCampus() {
  const campus = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';
  return temaCampusCentral(campus);
}

export function fmtFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Fecha corta para la lista: sin el año cuando el aviso es del año en curso
// ("24 jul"); el año solo aparece si es de otro año ("24 jul 2025").
export function fmtFechaCorta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mismoAnio = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('es-MX', mismoAnio
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtFechaHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
