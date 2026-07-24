// Utilidades compartidas por la vista de avisos del destinatario (lista y
// detalle). Theming por campus y formato de fecha, en un solo lugar.

export const FONT = '"DM Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif';

// Ags: navy #112540 / naranja #FF6B2B. Gdl: negro #0A0A0A / menta #2DD4BF.
export function temaCampus() {
  const campus = (typeof localStorage !== 'undefined' && localStorage.getItem('campus_activo')) || 'ags';
  return campus === 'gdl'
    ? { primary: '#0A0A0A', accent: '#2DD4BF', accentInk: '#0A0A0A' }
    : { primary: '#112540', accent: '#FF6B2B', accentInk: '#FFFFFF' };
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
